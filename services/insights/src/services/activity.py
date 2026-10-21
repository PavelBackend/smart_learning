from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from shared.contracts.events import AnswerRecordedEvent
from shared.errors import DomainError

from ..db import SessionLocal
from ..repositories.activity import ActivityRepository
from ..schemas import DailyActivity, InsightsSummary


class ActivityService:
    def record(self, event: AnswerRecordedEvent) -> None:
        with SessionLocal.begin() as session:
            ActivityRepository(session).upsert(event)

    def summary(self, timezone_name: str) -> InsightsSummary:
        try:
            local_timezone = ZoneInfo(timezone_name)
        except ZoneInfoNotFoundError as exc:
            raise DomainError(422, "Use a valid IANA timezone") from exc
        today = datetime.now(local_timezone).date()
        start = datetime.combine(today, time.min, local_timezone).astimezone(timezone.utc)
        end = datetime.combine(today + timedelta(days=1), time.min, local_timezone).astimezone(timezone.utc)
        with SessionLocal() as session:
            repository = ActivityRepository(session)
            total = repository.count()
            correct = repository.count(correct=True)
            counts = repository.daily_counts(today - timedelta(days=13), timezone_name)
            practiced_days = repository.practiced_days(timezone_name)
            cursor = today if today in practiced_days else today - timedelta(days=1)
            streak = 0
            while cursor in practiced_days:
                streak += 1
                cursor -= timedelta(days=1)
            return InsightsSummary(
                total_answers=total,
                correct_answers=correct,
                accuracy=round(correct / total * 100) if total else 0,
                today_answers=repository.count_between(start, end),
                today_words=repository.count_between(start, end, distinct_words=True),
                streak=streak,
                activity=[
                    DailyActivity(
                        date=today - timedelta(days=offset),
                        count=counts.get(today - timedelta(days=offset), 0),
                    )
                    for offset in range(13, -1, -1)
                ],
            )
