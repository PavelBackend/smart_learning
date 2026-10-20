from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..models import Activity


class ActivityRepository:
    def __init__(self, session: Session):
        self.session = session

    def add(self, activity: Activity) -> bool:
        if self.session.get(Activity, activity.event_id) is not None:
            return False
        self.session.add(activity)
        return True

    def count(self, *, correct: bool | None = None, day: date | None = None) -> int:
        query = select(func.count()).select_from(Activity)
        if correct is not None:
            query = query.where(Activity.correct.is_(correct))
        if day is not None:
            query = query.where(Activity.day == day)
        return self.session.scalar(query) or 0

    def daily_counts(self, since: date) -> dict[date, int]:
        return dict(
            self.session.execute(
                select(Activity.day, func.count()).where(Activity.day >= since).group_by(Activity.day)
            ).all()
        )

    def practiced_days(self) -> set[date]:
        return set(self.session.scalars(select(Activity.day).distinct()).all())
