from datetime import date, datetime, timezone

from sqlalchemy import Date, DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class DailyReport(Base):
    __tablename__ = "daily_reports"

    report_date: Mapped[date] = mapped_column(Date, primary_key=True)
    timezone: Mapped[str] = mapped_column(String(64))
    mood: Mapped[str | None] = mapped_column(String(16), nullable=True)
    thoughts: Mapped[str | None] = mapped_column(Text, nullable=True)
    highlight: Mapped[str | None] = mapped_column(Text, nullable=True)
    english_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    english_details: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_words: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sports_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sports_activity: Mapped[str | None] = mapped_column(String(300), nullable=True)
    exercises: Mapped[list[dict]] = mapped_column(JSONB, default=list)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
