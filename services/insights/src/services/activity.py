from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from shared.contracts.events import AnswerRecordedEvent

from ..config import get_settings
from ..db import SessionLocal
from ..models import Activity
from ..repositories.activity import ActivityRepository
from ..schemas import DailyActivity, InsightsSummary


class ActivityService:
    def __init__(self):
        self.timezone = ZoneInfo(get_settings().app_timezone)

    def record(self, event: AnswerRecordedEvent) -> None:
        with SessionLocal.begin() as session:
            ActivityRepository(session).add(
                Activity(
                    event_id=event.event_id,
                    word_id=event.word_id,
                    direction=event.direction,
                    correct=event.correct,
                    day=event.occurred_at.astimezone(self.timezone).date(),
                    occurred_at=event.occurred_at,
                )
            )

    def summary(self) -> InsightsSummary:
        today = datetime.now(self.timezone).date()
        with SessionLocal() as session:
            repository = ActivityRepository(session)
            total = repository.count()
            correct = repository.count(correct=True)
            counts = repository.daily_counts(today - timedelta(days=13))
            practiced_days = repository.practiced_days()
            cursor = today if today in practiced_days else today - timedelta(days=1)
            streak = 0
            while cursor in practiced_days:
                streak += 1
                cursor -= timedelta(days=1)
            return InsightsSummary(
                total_answers=total,
                correct_answers=correct,
                accuracy=round(correct / total * 100) if total else 0,
                today_answers=repository.count(day=today),
                streak=streak,
                activity=[
                    DailyActivity(
                        date=today - timedelta(days=offset),
                        count=counts.get(today - timedelta(days=offset), 0),
                    )
                    for offset in range(13, -1, -1)
                ],
            )
