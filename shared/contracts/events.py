from typing import Literal
from uuid import UUID

from pydantic import AwareDatetime

from shared.schemas import StrictModel

Direction = Literal["en_ru", "ru_en"]


class AnswerRecordedEvent(StrictModel):
    event_id: UUID
    word_id: UUID
    direction: Direction
    correct: bool
    occurred_at: AwareDatetime
