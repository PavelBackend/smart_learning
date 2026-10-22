from datetime import datetime
from uuid import UUID

from pydantic import Field, field_validator

from shared.contracts.events import Direction
from shared.contracts.words import Example
from shared.schemas import StrictModel


class AnswerInput(StrictModel):
    word_id: UUID
    direction: Direction
    answer: str = Field(min_length=1, max_length=500)
    review_only: bool = False

    @field_validator("answer")
    @classmethod
    def clean_answer(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Answer cannot be empty")
        return value


class ProgressInput(StrictModel):
    direction: Direction
    stage: int = Field(ge=0, le=6)


class ProgressRead(ProgressInput):
    word_id: UUID
    due_at: datetime


class ProgressList(StrictModel):
    items: list[ProgressRead]


class ProgressBatchInput(StrictModel):
    word_ids: list[UUID] = Field(max_length=100)


class Question(StrictModel):
    word_id: UUID
    english: str
    direction: Direction
    prompt: str
    part_of_speech: str | None
    stage: int = Field(ge=0, le=6)


class QuestionList(StrictModel):
    items: list[Question]


class AnswerResult(StrictModel):
    attempt_id: UUID | None
    correct: bool
    accepted: list[str] = Field(min_length=1)
    example: Example | None
    stage: int = Field(ge=0, le=6)
    due_at: datetime


class PracticeSummary(StrictModel):
    total_words: int = Field(ge=0)
    learned: int = Field(ge=0)
    due: int = Field(ge=0)
    attempts: int = Field(ge=0)


class CohortInput(StrictModel):
    count: int = Field(ge=1, le=10000)


class CohortRead(StrictModel):
    count: int = Field(ge=0)
    remaining: int = Field(ge=0)
    ready: bool
    available: int = Field(ge=0)
    due_en_ru: int = Field(ge=0)
    due_ru_en: int = Field(ge=0)
    can_add: bool
    required_level: int = 3
