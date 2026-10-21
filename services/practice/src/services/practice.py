from datetime import datetime, timedelta, timezone
from uuid import UUID

from shared.answers import normalize_answer
from shared.contracts.events import AnswerRecordedEvent
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
    ProgressBatchInput,
    ProgressInput,
    ProgressList,
    ProgressRead,
)

INTERVAL_DAYS = (0, 1, 3, 7, 14, 30, 60)


class PracticeService:
    def __init__(self):
        self.vocabulary = VocabularyClient()

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
            stage_before = row.stage
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
                stage_before=stage_before,
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
                attempt_id=attempt.id,
                correct=correct,
                accepted=accepted,
                example=word.examples[0] if word.examples else None,
                stage=row.stage,
                due_at=row.due_at,
            )

    def revise_attempt(self, attempt_id: UUID, *, accept: bool = False) -> AnswerResult:
        with SessionLocal.begin() as session:
            repository = PracticeRepository(session)
            attempt = repository.attempt(attempt_id)
            if attempt is None or attempt.voided:
                raise DomainError(404, "Ответ не найден")
            latest = repository.latest_attempt(attempt.word_id, attempt.direction)
            if latest is None or latest.id != attempt.id:
                raise DomainError(409, "Можно исправить только последний ответ для слова")
            word = self.vocabulary.get(attempt.word_id)
            accepted = word.translations if attempt.direction == "en_ru" else [word.english]
            correct = (
                True
                if accept
                else normalize_answer(attempt.answer) in {normalize_answer(value) for value in accepted}
            )
            row = repository.locked_progress(attempt.word_id, attempt.direction)
            if row is None:
                raise DomainError(409, "Прогресс слова не найден")
            if correct != attempt.correct:
                row.correct_count += int(correct) - int(attempt.correct)
                row.wrong_count += int(not correct) - int(not attempt.correct)
            attempt.correct = correct
            attempt.revision += 1
            row.stage = min(attempt.stage_before + 1, len(INTERVAL_DAYS) - 1) if correct else 0
            row.due_at = (
                attempt.created_at + timedelta(days=INTERVAL_DAYS[row.stage])
                if correct
                else attempt.created_at
            )
            repository.add_outbox(
                Outbox(
                    routing_key=ANSWER_ROUTING_KEY,
                    payload=AnswerRecordedEvent(
                        event_id=attempt.id,
                        word_id=attempt.word_id,
                        direction=attempt.direction,
                        correct=correct,
                        occurred_at=attempt.created_at,
                        revision=attempt.revision,
                    ).model_dump(mode="json"),
                )
            )
            return AnswerResult(
                attempt_id=attempt.id,
                correct=correct,
                accepted=accepted,
                example=word.examples[0] if word.examples else None,
                stage=row.stage,
                due_at=row.due_at,
            )

    def delete_word(self, word_id: UUID) -> None:
        self.vocabulary.delete(word_id)
        with SessionLocal.begin() as session:
            repository = PracticeRepository(session)
            for attempt in repository.word_attempts(word_id):
                if attempt.voided:
                    continue
                attempt.voided = True
                attempt.revision += 1
                repository.add_outbox(
                    Outbox(
                        routing_key=ANSWER_ROUTING_KEY,
                        payload=AnswerRecordedEvent(
                            event_id=attempt.id,
                            word_id=word_id,
                            direction=attempt.direction,
                            correct=attempt.correct,
                            occurred_at=attempt.created_at,
                            revision=attempt.revision,
                            voided=True,
                        ).model_dump(mode="json"),
                    )
                )
            repository.delete_word_progress(word_id)
            cohort = repository.cohort(lock=True)
            if cohort:
                cohort.word_ids = [value for value in cohort.word_ids if value != str(word_id)]

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

    def progress_batch(self, payload: ProgressBatchInput) -> ProgressList:
        with SessionLocal() as session:
            rows = PracticeRepository(session).progress_for_words(payload.word_ids)
            return ProgressList(
                items=[
                    ProgressRead(
                        word_id=row.word_id,
                        direction=row.direction,
                        stage=row.stage,
                        due_at=row.due_at,
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
        word_ids = set(self.vocabulary.ids())
        now = datetime.now(timezone.utc)
        with SessionLocal() as session:
            repository = PracticeRepository(session)
            rows = [row for row in repository.all_progress() if row.word_id in word_ids]
            stages_by_word: dict[UUID, dict[str, int]] = {}
            for row in rows:
                stages_by_word.setdefault(row.word_id, {})[row.direction] = row.stage
            cohort = repository.cohort()
            active_ids = {UUID(value) for value in cohort.word_ids} & word_ids if cohort else set()
            progress_keys = {(row.word_id, row.direction) for row in rows}
            active_missing = sum(
                (word_id, direction) not in progress_keys
                for word_id in active_ids
                for direction in ("en_ru", "ru_en")
            )
            return PracticeSummary(
                total_words=len(word_ids),
                learned=sum(
                    stages.get("en_ru", 0) >= 4 and stages.get("ru_en", 0) >= 4
                    for stages in stages_by_word.values()
                ),
                due=sum(row.due_at <= now for row in rows) + active_missing,
                attempts=repository.count_attempts(),
            )
