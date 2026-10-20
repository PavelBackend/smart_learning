from datetime import date, datetime
from uuid import UUID

from sqlalchemy import Date, DateTime, String
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


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
