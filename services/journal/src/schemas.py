from datetime import date, datetime
from typing import Literal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import ConfigDict, Field, field_validator

from shared.schemas import StrictModel


class Exercise(StrictModel):
    name: str = Field(min_length=1, max_length=100)
    sets: int | None = Field(default=None, ge=1, le=100)
    repetitions: int | None = Field(default=None, ge=1, le=10_000)


class ReportInput(StrictModel):
    timezone: str = Field(max_length=64)
    mood: Literal["great", "good", "okay", "low"] | None = None
    thoughts: str | None = Field(default=None, max_length=10_000)
    highlight: str | None = Field(default=None, max_length=3_000)
    english_minutes: int | None = Field(default=None, ge=0, le=1_440)
    english_details: str | None = Field(default=None, max_length=3_000)
    reviewed_words: int | None = Field(default=None, ge=0, le=100_000)
    sports_minutes: int | None = Field(default=None, ge=0, le=1_440)
    sports_activity: str | None = Field(default=None, max_length=300)
    exercises: list[Exercise] = Field(default_factory=list, max_length=50)

    @field_validator("timezone")
    @classmethod
    def valid_timezone(cls, value: str) -> str:
        try:
            ZoneInfo(value)
        except ZoneInfoNotFoundError as exc:
            raise ValueError("Use a valid IANA timezone") from exc
        return value


class ReportRead(ReportInput):
    model_config = ConfigDict(from_attributes=True)

    report_date: date
    created_at: datetime
    updated_at: datetime


class ReportList(StrictModel):
    items: list[ReportRead]
