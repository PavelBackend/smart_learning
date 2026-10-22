from datetime import date
from typing import Annotated

from fastapi import APIRouter, Query

from ..schemas import ReportInput, ReportList, ReportRead
from ..services.reports import ReportService

router = APIRouter(prefix="/journal/reports", tags=["reports"])
service = ReportService()


@router.get("", response_model=ReportList)
def list_reports(limit: Annotated[int, Query(ge=1, le=365)] = 60) -> ReportList:
    return service.list(limit)


@router.get("/calendar", response_model=ReportList)
def calendar_reports(
    year: Annotated[int, Query(ge=2000, le=2100)],
    month: Annotated[int, Query(ge=1, le=12)],
) -> ReportList:
    return service.month(year, month)


@router.get("/{report_date}", response_model=ReportRead)
def get_report(report_date: date) -> ReportRead:
    return service.get(report_date)


@router.put("/{report_date}", response_model=ReportRead)
def save_report(report_date: date, payload: ReportInput) -> ReportRead:
    return service.save(report_date, payload)
