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

    def add(self, report: DailyReport) -> None:
        self.session.add(report)
