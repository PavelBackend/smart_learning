from datetime import date

from pydantic import Field

from shared.schemas import StrictModel


class DailyActivity(StrictModel):
    date: date
    count: int = Field(ge=0)


class InsightsSummary(StrictModel):
    total_answers: int = Field(ge=0)
    correct_answers: int = Field(ge=0)
    accuracy: int = Field(ge=0, le=100)
    today_answers: int = Field(ge=0)
    today_words: int = Field(ge=0)
    streak: int = Field(ge=0)
    activity: list[DailyActivity]
