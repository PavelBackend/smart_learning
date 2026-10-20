import os
from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import FastAPI
from sqlalchemy import Date, DateTime, String, create_engine, func, select
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker


engine = create_engine(os.environ["DATABASE_URL"], pool_pre_ping=True)
Session = sessionmaker(engine)
TIMEZONE = ZoneInfo(os.getenv("APP_TIMEZONE", "Europe/Moscow"))


class Base(DeclarativeBase):
    pass


class Activity(Base):
    __tablename__ = "activity"
    event_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True)
    word_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), index=True)
    direction: Mapped[str] = mapped_column(String(5))
    correct: Mapped[bool]
    day: Mapped[date] = mapped_column(Date, index=True)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


@asynccontextmanager
async def lifespan(_app: FastAPI):
    Base.metadata.create_all(engine)
    yield


app = FastAPI(title="Insights service", lifespan=lifespan)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/insights/summary")
def summary():
    today = datetime.now(TIMEZONE).date()
    with Session() as session:
        total = session.scalar(select(func.count()).select_from(Activity)) or 0
        correct = session.scalar(select(func.count()).select_from(Activity).where(Activity.correct.is_(True))) or 0
        today_count = session.scalar(select(func.count()).select_from(Activity).where(Activity.day == today)) or 0
        counts = dict(session.execute(select(Activity.day, func.count()).where(Activity.day >= today - timedelta(days=13)).group_by(Activity.day)).all())
        practiced_days = set(session.scalars(select(Activity.day).distinct()).all())
        cursor = today if today in practiced_days else today - timedelta(days=1)
        streak = 0
        while cursor in practiced_days:
            streak += 1
            cursor -= timedelta(days=1)
        return {
            "total_answers": total,
            "correct_answers": correct,
            "accuracy": round(correct / total * 100) if total else 0,
            "today_answers": today_count,
            "streak": streak,
            "activity": [{"date": (today - timedelta(days=offset)).isoformat(), "count": counts.get(today - timedelta(days=offset), 0)} for offset in range(13, -1, -1)],
        }
