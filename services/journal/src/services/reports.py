from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo

from shared.errors import DomainError

from ..db import SessionLocal
from ..models import DailyReport
from ..repositories.reports import ReportRepository
from ..schemas import ReportInput, ReportList, ReportRead


class ReportService:
    def month(self, year: int, month: int) -> ReportList:
        with SessionLocal() as session:
            return ReportList(
                items=[ReportRead.model_validate(row) for row in ReportRepository(session).month(year, month)]
            )

    def list(self, limit: int) -> ReportList:
        with SessionLocal() as session:
            return ReportList(
                items=[ReportRead.model_validate(row) for row in ReportRepository(session).list(limit)]
            )

    def get(self, report_date: date) -> ReportRead:
        with SessionLocal() as session:
            row = ReportRepository(session).get(report_date)
            if row is None:
                raise DomainError(404, "Report not found")
            return ReportRead.model_validate(row)

    def save(self, report_date: date, payload: ReportInput) -> ReportRead:
        if report_date > datetime.now(ZoneInfo(payload.timezone)).date():
            raise DomainError(422, "A future day cannot be reported")
        with SessionLocal.begin() as session:
            repository = ReportRepository(session)
            row = repository.get(report_date)
            data = payload.model_dump(mode="json")
            if row is None:
                row = DailyReport(report_date=report_date, **data)
                repository.add(row)
            else:
                for key, value in data.items():
                    setattr(row, key, value)
                row.updated_at = datetime.now(timezone.utc)
            session.flush()
            return ReportRead.model_validate(row)
