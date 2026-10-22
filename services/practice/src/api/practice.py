from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query

from shared.contracts.events import Direction

from ..schemas import (
    AnswerInput,
    AnswerResult,
    CohortInput,
    CohortRead,
    PracticeSummary,
    ProgressBatchInput,
    ProgressInput,
    ProgressList,
    ProgressRead,
    Question,
    QuestionList,
)
from ..services.cohort import CohortService
from ..services.practice import PracticeService

router = APIRouter(prefix="/practice", tags=["practice"])


@router.get("/cohort", response_model=CohortRead)
def get_cohort() -> CohortRead:
    return CohortService().read()


@router.post("/cohort", response_model=CohortRead)
def start_cohort(payload: CohortInput) -> CohortRead:
    return CohortService().start(payload)


@router.post("/cohort/expand", response_model=CohortRead)
def expand_cohort(payload: CohortInput) -> CohortRead:
    return CohortService().expand(payload)


@router.get("/next", response_model=Question)
def next_question(direction: Annotated[Direction, Query()] = "en_ru") -> Question:
    return CohortService().next_question(direction)


@router.get("/round", response_model=QuestionList)
def round_questions(direction: Annotated[Direction, Query()] = "en_ru") -> QuestionList:
    return CohortService().questions(direction)


@router.post("/answer", response_model=AnswerResult)
def submit_answer(payload: AnswerInput) -> AnswerResult:
    return PracticeService().answer(payload)


@router.post("/attempts/{attempt_id}/accept", response_model=AnswerResult)
def accept_attempt(attempt_id: UUID) -> AnswerResult:
    return PracticeService().revise_attempt(attempt_id, accept=True)


@router.post("/attempts/{attempt_id}/recheck", response_model=AnswerResult)
def recheck_attempt(attempt_id: UUID) -> AnswerResult:
    return PracticeService().revise_attempt(attempt_id)


@router.delete("/words/{word_id}", status_code=204)
def delete_word(word_id: UUID) -> None:
    PracticeService().delete_word(word_id)


@router.get("/progress", response_model=ProgressList)
def list_progress() -> ProgressList:
    return PracticeService().progress()


@router.post("/progress/batch", response_model=ProgressList)
def batch_progress(payload: ProgressBatchInput) -> ProgressList:
    return PracticeService().progress_batch(payload)


@router.put("/progress/{word_id}", response_model=ProgressRead)
def set_progress(word_id: UUID, payload: ProgressInput) -> ProgressRead:
    return PracticeService().set_progress(word_id, payload)


@router.get("/summary", response_model=PracticeSummary)
def summary() -> PracticeSummary:
    return PracticeService().summary()
