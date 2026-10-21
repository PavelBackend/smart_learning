from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from shared.contracts.events import Direction

from ..models import Attempt, Outbox, Progress, StudyCohort


class PracticeRepository:
    def __init__(self, session: Session):
        self.session = session

    def progress_for_direction(self, direction: Direction) -> list[Progress]:
        return list(self.session.scalars(select(Progress).where(Progress.direction == direction)).all())

    def all_progress(self) -> list[Progress]:
        return list(self.session.scalars(select(Progress)).all())

    def progress_for_words(self, word_ids: list[UUID]) -> list[Progress]:
        if not word_ids:
            return []
        return list(self.session.scalars(select(Progress).where(Progress.word_id.in_(word_ids))).all())

    def locked_progress(self, word_id: UUID, direction: Direction) -> Progress | None:
        return self.session.scalar(
            select(Progress)
            .where(Progress.word_id == word_id, Progress.direction == direction)
            .with_for_update()
        )

    def add_progress(self, word_id: UUID, direction: Direction) -> Progress:
        row = Progress(word_id=word_id, direction=direction, stage=0, correct_count=0, wrong_count=0)
        self.session.add(row)
        return row

    def add_attempt(self, attempt: Attempt) -> None:
        self.session.add(attempt)

    def attempt(self, attempt_id: UUID) -> Attempt | None:
        return self.session.get(Attempt, attempt_id, with_for_update=True)

    def word_attempts(self, word_id: UUID) -> list[Attempt]:
        return list(
            self.session.scalars(select(Attempt).where(Attempt.word_id == word_id).with_for_update()).all()
        )

    def latest_attempt(self, word_id: UUID, direction: Direction) -> Attempt | None:
        return self.session.scalar(
            select(Attempt)
            .where(Attempt.word_id == word_id, Attempt.direction == direction, Attempt.voided.is_(False))
            .order_by(Attempt.created_at.desc(), Attempt.id.desc())
            .limit(1)
        )

    def cohort(self, *, lock: bool = False) -> StudyCohort | None:
        query = select(StudyCohort).where(StudyCohort.id == 1)
        return self.session.scalar(query.with_for_update() if lock else query)

    def delete_word_progress(self, word_id: UUID) -> None:
        for row in self.session.scalars(select(Progress).where(Progress.word_id == word_id)).all():
            self.session.delete(row)

    def add_outbox(self, event: Outbox) -> None:
        self.session.add(event)

    def count_attempts(self) -> int:
        return (
            self.session.scalar(select(func.count()).select_from(Attempt).where(Attempt.voided.is_(False)))
            or 0
        )

    def pending_events(self, limit: int = 50) -> list[Outbox]:
        return list(
            self.session.scalars(
                select(Outbox)
                .where(Outbox.published_at.is_(None))
                .order_by(Outbox.created_at)
                .limit(limit)
                .with_for_update(skip_locked=True)
            ).all()
        )
