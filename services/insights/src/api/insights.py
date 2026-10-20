from fastapi import APIRouter

from ..schemas import InsightsSummary
from ..services.activity import ActivityService

router = APIRouter(prefix="/insights", tags=["insights"])


@router.get("/summary", response_model=InsightsSummary)
def summary() -> InsightsSummary:
    return ActivityService().summary()
