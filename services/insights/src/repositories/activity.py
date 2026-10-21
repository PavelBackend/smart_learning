from datetime import date, datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from shared.contracts.events import AnswerRecordedEvent

from ..models import Activity


class ActivityRepository:
    def __init__(self, session: Session):
        self.session = session

    def upsert(self, event: AnswerRecordedEvent) -> None:
        values = dict(
            event_id=event.event_id,
            word_id=event.word_id,
            direction=event.direction,
            correct=event.correct,
            revision=event.revision,
            voided=event.voided,
            day=event.occurred_at.astimezone(timezone.utc).date(),
            occurred_at=event.occurred_at,
        )
        statement = insert(Activity).values(**values)
        self.session.execute(
            statement.on_conflict_do_update(
                index_elements=[Activity.event_id],
                set_={"correct": event.correct, "revision": event.revision, "voided": event.voided},
                where=Activity.revision < event.revision,
            )
        )

    def count(self, *, correct: bool | None = None) -> int:
        query = select(func.count()).select_from(Activity).where(Activity.voided.is_(False))
        if correct is not None:
            query = query.where(Activity.correct.is_(correct))
        return self.session.scalar(query) or 0

    def count_between(self, start: datetime, end: datetime, *, distinct_words: bool = False) -> int:
        target = func.count(func.distinct(Activity.word_id)) if distinct_words else func.count()
        return (
            self.session.scalar(
                select(target).where(
                    Activity.voided.is_(False), Activity.occurred_at >= start, Activity.occurred_at < end
                )
            )
            or 0
        )

    def daily_counts(self, since: date, timezone_name: str) -> dict[date, int]:
        local_day = func.date(func.timezone(timezone_name, Activity.occurred_at))
        return dict(
            self.session.execute(
                select(local_day, func.count())
                .where(Activity.voided.is_(False), local_day >= since)
                .group_by(local_day)
            ).all()
        )

    def practiced_days(self, timezone_name: str) -> set[date]:
        local_day = func.date(func.timezone(timezone_name, Activity.occurred_at))
        return set(self.session.scalars(select(local_day).where(Activity.voided.is_(False)).distinct()).all())
