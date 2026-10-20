from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query

from shared.contracts.events import Direction

from ..schemas import (
    AnswerInput,
    AnswerResult,
    PracticeSummary,
    ProgressInput,
    ProgressList,
    ProgressRead,
    Question,
)
from ..services.practice import PracticeService

router = APIRouter(prefix="/practice", tags=["practice"])


@router.get("/next", response_model=Question)
def next_question(direction: Annotated[Direction, Query()] = "en_ru") -> Question:
    return PracticeService().next_question(direction)


@router.post("/answer", response_model=AnswerResult)
def submit_answer(payload: AnswerInput) -> AnswerResult:
    return PracticeService().answer(payload)


@router.get("/progress", response_model=ProgressList)
def list_progress() -> ProgressList:
    return PracticeService().progress()


@router.put("/progress/{word_id}", response_model=ProgressRead)
def set_progress(word_id: UUID, payload: ProgressInput) -> ProgressRead:
    return PracticeService().set_progress(word_id, payload)


@router.get("/summary", response_model=PracticeSummary)
def summary() -> PracticeSummary:
    return PracticeService().summary()
