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


class Question(StrictModel):
    word_id: UUID
    direction: Direction
    prompt: str
    part_of_speech: str | None
    stage: int = Field(ge=0, le=6)


class AnswerResult(StrictModel):
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
