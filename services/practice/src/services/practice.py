from datetime import datetime, timedelta, timezone
from uuid import UUID

from shared.answers import normalize_answer
from shared.contracts.events import AnswerRecordedEvent, Direction
from shared.errors import DomainError
from shared.messaging import ANSWER_ROUTING_KEY

from ..clients.vocabulary import VocabularyClient
from ..db import SessionLocal
from ..models import Attempt, Outbox
from ..repositories.practice import PracticeRepository
from ..schemas import (
    AnswerInput,
    AnswerResult,
    PracticeSummary,
    ProgressInput,
    ProgressList,
    ProgressRead,
    Question,
)
from .selection import choose_word

INTERVAL_DAYS = (0, 1, 3, 7, 14, 30, 60)


class PracticeService:
    def __init__(self):
        self.vocabulary = VocabularyClient()

    def next_question(self, direction: Direction) -> Question:
        words = self.vocabulary.list()
        if not words:
            raise DomainError(404, "Add words before practicing")
        now = datetime.now(timezone.utc)
        with SessionLocal() as session:
            progress = {
                row.word_id: row for row in PracticeRepository(session).progress_for_direction(direction)
            }
            word = choose_word(words, progress, now)
            return Question(
                word_id=word.id,
                direction=direction,
                prompt=word.english if direction == "en_ru" else word.translations[0],
                part_of_speech=word.part_of_speech,
                stage=progress[word.id].stage if word.id in progress else 0,
            )

    def answer(self, payload: AnswerInput) -> AnswerResult:
        word = self.vocabulary.get(payload.word_id)
        accepted = word.translations if payload.direction == "en_ru" else [word.english]
        correct = normalize_answer(payload.answer) in {normalize_answer(value) for value in accepted}
        now = datetime.now(timezone.utc)
        with SessionLocal.begin() as session:
            repository = PracticeRepository(session)
            row = repository.locked_progress(payload.word_id, payload.direction) or repository.add_progress(
                payload.word_id, payload.direction
            )
            row.stage = min(row.stage + 1, len(INTERVAL_DAYS) - 1) if correct else 0
            row.correct_count += int(correct)
            row.wrong_count += int(not correct)
            row.last_seen_at = now
            row.due_at = now + timedelta(days=INTERVAL_DAYS[row.stage]) if correct else now
            attempt = Attempt(
                word_id=payload.word_id,
                direction=payload.direction,
                answer=payload.answer.strip(),
                correct=correct,
                created_at=now,
            )
            repository.add_attempt(attempt)
            session.flush()
            event = AnswerRecordedEvent(
                event_id=attempt.id,
                word_id=payload.word_id,
                direction=payload.direction,
                correct=correct,
                occurred_at=now,
            )
            repository.add_outbox(
                Outbox(routing_key=ANSWER_ROUTING_KEY, payload=event.model_dump(mode="json"))
            )
            return AnswerResult(
                correct=correct,
                accepted=accepted,
                example=word.examples[0] if word.examples else None,
                stage=row.stage,
                due_at=row.due_at,
            )

    def progress(self) -> ProgressList:
        with SessionLocal() as session:
            rows = PracticeRepository(session).all_progress()
            return ProgressList(
                items=[
                    ProgressRead(
                        word_id=row.word_id, direction=row.direction, stage=row.stage, due_at=row.due_at
                    )
                    for row in rows
                ]
            )

    def set_progress(self, word_id: UUID, payload: ProgressInput) -> ProgressRead:
        self.vocabulary.get(word_id)
        now = datetime.now(timezone.utc)
        with SessionLocal.begin() as session:
            repository = PracticeRepository(session)
            row = repository.locked_progress(word_id, payload.direction) or repository.add_progress(
                word_id, payload.direction
            )
            row.stage = payload.stage
            row.due_at = now + timedelta(days=INTERVAL_DAYS[payload.stage])
            session.flush()
            return ProgressRead(
                word_id=word_id, direction=payload.direction, stage=row.stage, due_at=row.due_at
            )

    def summary(self) -> PracticeSummary:
        word_ids = {word.id for word in self.vocabulary.list()}
        now = datetime.now(timezone.utc)
        with SessionLocal() as session:
            repository = PracticeRepository(session)
            rows = [row for row in repository.all_progress() if row.word_id in word_ids]
            stages_by_word: dict[UUID, dict[str, int]] = {}
            for row in rows:
                stages_by_word.setdefault(row.word_id, {})[row.direction] = row.stage
            return PracticeSummary(
                total_words=len(word_ids),
                learned=sum(
                    stages.get("en_ru", 0) >= 4 and stages.get("ru_en", 0) >= 4
                    for stages in stages_by_word.values()
                ),
                due=sum(row.due_at <= now for row in rows) + 2 * len(word_ids) - len(rows),
                attempts=repository.count_attempts(),
            )
