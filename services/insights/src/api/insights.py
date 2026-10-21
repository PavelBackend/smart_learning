from typing import Annotated

from fastapi import APIRouter, Query

from ..schemas import InsightsSummary
from ..services.activity import ActivityService

router = APIRouter(prefix="/insights", tags=["insights"])


@router.get("/summary", response_model=InsightsSummary)
def summary(timezone: Annotated[str, Query(max_length=64)] = "UTC") -> InsightsSummary:
    return ActivityService().summary(timezone)
