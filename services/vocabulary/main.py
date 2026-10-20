import json
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import DateTime, String, create_engine, func, select
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker


engine = create_engine(os.environ["DATABASE_URL"], pool_pre_ping=True)
Session = sessionmaker(engine)


class Base(DeclarativeBase):
    pass


class Word(Base):
    __tablename__ = "words"
    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    english: Mapped[str] = mapped_column(String(200))
    english_key: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    translations: Mapped[list[str]] = mapped_column(JSONB)
    examples: Mapped[list[dict]] = mapped_column(JSONB, default=list)
    part_of_speech: Mapped[str | None] = mapped_column(String(80), nullable=True)
    note: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    tags: Mapped[list[str]] = mapped_column(JSONB, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class ExampleInput(BaseModel):
    en: str = Field(min_length=1, max_length=500)
    ru: str = Field(min_length=1, max_length=500)


class WordInput(BaseModel):
    english: str = Field(min_length=1, max_length=200)
    translations: list[str] = Field(min_length=1)
    examples: list[ExampleInput] = Field(default_factory=list)
    part_of_speech: str | None = Field(default=None, max_length=80)
    note: str | None = Field(default=None, max_length=1000)
    tags: list[str] = Field(default_factory=list)

    @field_validator("english")
    @classmethod
    def clean_english(cls, value: str) -> str:
        value = " ".join(value.split())
        if not value:
            raise ValueError("English word is empty")
        return value

    @field_validator("translations")
    @classmethod
    def clean_translations(cls, values: list[str]) -> list[str]:
        cleaned = list(dict.fromkeys(value.strip() for value in values if value.strip()))
        if not cleaned:
            raise ValueError("Translations cannot be empty")
        return cleaned

    @field_validator("tags")
    @classmethod
    def clean_tags(cls, values: list[str]) -> list[str]:
        return list(dict.fromkeys(value.strip() for value in values if value.strip()))


def as_dict(word: Word) -> dict:
    return {
        "id": str(word.id), "english": word.english,
        "translations": word.translations, "examples": word.examples,
        "part_of_speech": word.part_of_speech, "note": word.note,
        "tags": word.tags, "created_at": word.created_at.isoformat(),
    }


@asynccontextmanager
async def lifespan(_app: FastAPI):
    Base.metadata.create_all(engine)
    yield


app = FastAPI(title="Vocabulary service", lifespan=lifespan)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/words")
def list_words(search: str = "", limit: Annotated[int, Query(ge=1, le=10000)] = 100, offset: Annotated[int, Query(ge=0)] = 0):
    with Session() as session:
        query = select(Word)
        if search.strip():
            query = query.where(Word.english.ilike(f"%{search.strip()}%") | Word.translations.cast(String).ilike(f"%{search.strip()}%"))
        total = session.scalar(select(func.count()).select_from(query.subquery()))
        words = session.scalars(query.order_by(Word.created_at.desc()).offset(offset).limit(limit)).all()
        return {"items": [as_dict(word) for word in words], "total": total}


@app.get("/words/export")
def export_words():
    with Session() as session:
        return {"words": [WordInput.model_validate(as_dict(word)).model_dump() for word in session.scalars(select(Word).order_by(Word.english)).all()]}


@app.get("/words/{word_id}")
def get_word(word_id: UUID):
    with Session() as session:
        word = session.get(Word, word_id)
        if not word:
            raise HTTPException(404, "Word not found")
        return as_dict(word)


@app.post("/words", status_code=201)
def create_word(payload: WordInput):
    with Session.begin() as session:
        key = payload.english.casefold()
        if session.scalar(select(Word.id).where(Word.english_key == key)):
            raise HTTPException(409, "Word already exists")
        word = Word(english_key=key, **payload.model_dump())
        session.add(word)
        session.flush()
        return as_dict(word)


@app.put("/words/{word_id}")
def update_word(word_id: UUID, payload: WordInput):
    with Session.begin() as session:
        word = session.get(Word, word_id)
        if not word:
            raise HTTPException(404, "Word not found")
        key = payload.english.casefold()
        duplicate = session.scalar(select(Word.id).where(Word.english_key == key, Word.id != word_id))
        if duplicate:
            raise HTTPException(409, "Word already exists")
        for field, value in payload.model_dump().items():
            setattr(word, field, value)
        word.english_key = key
        session.flush()
        return as_dict(word)


@app.delete("/words/{word_id}", status_code=204)
def delete_word(word_id: UUID):
    with Session.begin() as session:
        word = session.get(Word, word_id)
        if not word:
            raise HTTPException(404, "Word not found")
        session.delete(word)


@app.post("/words/import")
async def import_words(file: Annotated[UploadFile, File()]):
    if not file.filename or not file.filename.lower().endswith(".json"):
        raise HTTPException(400, "Upload a .json file")
    raw = await file.read(2_000_001)
    if len(raw) > 2_000_000:
        raise HTTPException(413, "File is larger than 2 MB")
    try:
        data = json.loads(raw)
        entries = data["words"] if isinstance(data, dict) else data
        if not isinstance(entries, list) or not entries:
            raise ValueError("Expected a non-empty words array")
        parsed = [WordInput.model_validate(entry) for entry in entries]
    except (ValueError, KeyError, TypeError) as exc:
        raise HTTPException(422, f"Invalid JSON: {exc}") from exc
    created = updated = 0
    with Session.begin() as session:
        for payload in parsed:
            key = payload.english.casefold()
            word = session.scalar(select(Word).where(Word.english_key == key))
            if word:
                for field, value in payload.model_dump().items():
                    setattr(word, field, value)
                updated += 1
            else:
                session.add(Word(english_key=key, **payload.model_dump()))
                session.flush()
                created += 1
    return {"created": created, "updated": updated, "total": len(parsed)}
