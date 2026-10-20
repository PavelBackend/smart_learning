import os
import random
import re
import unicodedata
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from typing import Literal
from uuid import UUID, uuid4

import httpx
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import DateTime, Integer, String, UniqueConstraint, create_engine, func, select
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker


engine = create_engine(os.environ["DATABASE_URL"], pool_pre_ping=True)
Session = sessionmaker(engine)
VOCABULARY_URL = os.environ["VOCABULARY_URL"]
Direction = Literal["en_ru", "ru_en"]
INTERVAL_DAYS = (0, 1, 3, 7, 14, 30, 60)


class Base(DeclarativeBase):
    pass


class Progress(Base):
    __tablename__ = "progress"
    __table_args__ = (UniqueConstraint("word_id", "direction"),)
    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    word_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), index=True)
    direction: Mapped[str] = mapped_column(String(5))
    stage: Mapped[int] = mapped_column(Integer, default=0)
    correct_count: Mapped[int] = mapped_column(Integer, default=0)
    wrong_count: Mapped[int] = mapped_column(Integer, default=0)
    due_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Attempt(Base):
    __tablename__ = "attempts"
    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    word_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), index=True)
    direction: Mapped[str] = mapped_column(String(5))
    answer: Mapped[str] = mapped_column(String(500))
    correct: Mapped[bool]
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class Outbox(Base):
    __tablename__ = "outbox"
    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    routing_key: Mapped[str] = mapped_column(String(100))
    payload: Mapped[dict] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class AnswerInput(BaseModel):
    word_id: UUID
    direction: Direction
    answer: str = Field(min_length=1, max_length=500)


class ProgressInput(BaseModel):
    direction: Direction
    stage: int = Field(ge=0, le=6)


def normalize(value: str) -> str:
    value = unicodedata.normalize("NFKC", value).casefold().replace("ё", "е")
    value = re.sub(r"[^\w\s-]", " ", value, flags=re.UNICODE)
    return " ".join(value.split())


def get_vocabulary() -> list[dict]:
    try:
        response = httpx.get(f"{VOCABULARY_URL}/words", params={"limit": 10000}, timeout=10)
        response.raise_for_status()
        return response.json()["items"]
    except httpx.HTTPError as exc:
        raise HTTPException(503, "Vocabulary service is unavailable") from exc


def get_word(word_id: UUID) -> dict:
    try:
        response = httpx.get(f"{VOCABULARY_URL}/words/{word_id}", timeout=10)
        if response.status_code == 404:
            raise HTTPException(404, "Word not found")
        response.raise_for_status()
        return response.json()
    except httpx.HTTPError as exc:
        raise HTTPException(503, "Vocabulary service is unavailable") from exc


@asynccontextmanager
async def lifespan(_app: FastAPI):
    Base.metadata.create_all(engine)
    yield


app = FastAPI(title="Practice service", lifespan=lifespan)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/practice/next")
def next_question(direction: Direction = Query("en_ru")):
    words = get_vocabulary()
    if not words:
        raise HTTPException(404, "Add words before practicing")
    now = datetime.now(timezone.utc)
    with Session() as session:
        progress = {row.word_id: row for row in session.scalars(select(Progress).where(Progress.direction == direction)).all()}
        weights = []
        for word in words:
            row = progress.get(UUID(word["id"]))
            if row is None:
                weight = 4.0
            else:
                weight = 1.0 / (row.stage + 1) ** 1.5
                if row.due_at <= now:
                    weight *= 4
                else:
                    weight *= 0.1
                if row.last_seen_at and (now - row.last_seen_at).total_seconds() < 90:
                    weight *= 0.05
            weights.append(max(weight, 0.001))
        word = random.choices(words, weights=weights, k=1)[0]
        return {
            "word_id": word["id"], "direction": direction,
            "prompt": word["english"] if direction == "en_ru" else word["translations"][0],
            "part_of_speech": word["part_of_speech"],
            "stage": progress[UUID(word["id"])].stage if UUID(word["id"]) in progress else 0,
        }


@app.post("/practice/answer")
def submit_answer(payload: AnswerInput):
    word = get_word(payload.word_id)
    accepted = word["translations"] if payload.direction == "en_ru" else [word["english"]]
    correct = normalize(payload.answer) in {normalize(value) for value in accepted}
    now = datetime.now(timezone.utc)
    with Session.begin() as session:
        row = session.scalar(select(Progress).where(Progress.word_id == payload.word_id, Progress.direction == payload.direction).with_for_update())
        if row is None:
            row = Progress(word_id=payload.word_id, direction=payload.direction, stage=0, correct_count=0, wrong_count=0)
            session.add(row)
        row.stage = min(row.stage + 1, len(INTERVAL_DAYS) - 1) if correct else 0
        row.correct_count += int(correct)
        row.wrong_count += int(not correct)
        row.last_seen_at = now
        row.due_at = now + timedelta(days=INTERVAL_DAYS[row.stage]) if correct else now
        attempt = Attempt(word_id=payload.word_id, direction=payload.direction, answer=payload.answer.strip(), correct=correct, created_at=now)
        session.add(attempt)
        session.flush()
        event = {
            "event_id": str(attempt.id), "word_id": str(payload.word_id),
            "direction": payload.direction, "correct": correct, "occurred_at": now.isoformat(),
        }
        session.add(Outbox(routing_key="practice.answer_recorded", payload=event))
        return {
            "correct": correct, "accepted": accepted,
            "example": word["examples"][0] if word["examples"] else None,
            "stage": row.stage, "due_at": row.due_at.isoformat(),
        }


@app.get("/practice/progress")
def list_progress():
    with Session() as session:
        rows = session.scalars(select(Progress)).all()
        return {"items": [{"word_id": str(row.word_id), "direction": row.direction, "stage": row.stage, "due_at": row.due_at.isoformat()} for row in rows]}


@app.put("/practice/progress/{word_id}")
def set_progress(word_id: UUID, payload: ProgressInput):
    get_word(word_id)
    now = datetime.now(timezone.utc)
    with Session.begin() as session:
        row = session.scalar(select(Progress).where(Progress.word_id == word_id, Progress.direction == payload.direction).with_for_update())
        if row is None:
            row = Progress(word_id=word_id, direction=payload.direction, stage=payload.stage, correct_count=0, wrong_count=0)
            session.add(row)
        row.stage = payload.stage
        row.due_at = now + timedelta(days=INTERVAL_DAYS[payload.stage])
        session.flush()
        return {"word_id": str(word_id), "direction": row.direction, "stage": row.stage, "due_at": row.due_at.isoformat()}


@app.get("/practice/summary")
def summary():
    word_ids = {UUID(word["id"]) for word in get_vocabulary()}
    word_count = len(word_ids)
    now = datetime.now(timezone.utc)
    with Session() as session:
        rows = [row for row in session.scalars(select(Progress)).all() if row.word_id in word_ids]
        stages_by_word = {}
        for row in rows:
            stages_by_word.setdefault(row.word_id, {})[row.direction] = row.stage
        return {
            "total_words": word_count,
            "learned": sum(stages.get("en_ru", 0) >= 4 and stages.get("ru_en", 0) >= 4 for stages in stages_by_word.values()),
            "due": sum(row.due_at <= now for row in rows) + 2 * word_count - len(rows),
            "attempts": session.scalar(select(func.count()).select_from(Attempt)),
        }
