from __future__ import annotations

from calendar import monthrange
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import DailyReport


class ReportRepository:
    def __init__(self, session: Session):
        self.session = session

    def get(self, report_date: date) -> DailyReport | None:
        return self.session.get(DailyReport, report_date)

    def list(self, limit: int) -> list[DailyReport]:
        return list(
            self.session.scalars(
                select(DailyReport).order_by(DailyReport.report_date.desc()).limit(limit)
            ).all()
        )

    def month(self, year: int, month: int) -> list[DailyReport]:
        start = date(year, month, 1)
        end = date(year, month, monthrange(year, month)[1])
        return list(
            self.session.scalars(
                select(DailyReport)
                .where(DailyReport.report_date.between(start, end))
                .order_by(DailyReport.report_date)
            ).all()
        )

    def add(self, report: DailyReport) -> None:
        self.session.add(report)
