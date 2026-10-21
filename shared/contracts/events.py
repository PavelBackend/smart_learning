from typing import Literal
from uuid import UUID

from pydantic import AwareDatetime, Field

from shared.schemas import StrictModel

Direction = Literal["en_ru", "ru_en"]


class AnswerRecordedEvent(StrictModel):
    event_id: UUID
    word_id: UUID
    direction: Direction
    correct: bool
    occurred_at: AwareDatetime
    revision: int = Field(default=0, ge=0)
    voided: bool = False
