from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from shared.contracts.events import Direction

from ..models import Attempt, Outbox, Progress


class PracticeRepository:
    def __init__(self, session: Session):
        self.session = session

    def progress_for_direction(self, direction: Direction) -> list[Progress]:
        return list(self.session.scalars(select(Progress).where(Progress.direction == direction)).all())

    def all_progress(self) -> list[Progress]:
        return list(self.session.scalars(select(Progress)).all())

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

    def add_outbox(self, event: Outbox) -> None:
        self.session.add(event)

    def count_attempts(self) -> int:
        return self.session.scalar(select(func.count()).select_from(Attempt)) or 0

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
