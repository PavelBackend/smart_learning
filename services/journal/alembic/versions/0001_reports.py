"""Create daily reports."""

from alembic import op
from sqlalchemy import Column, Date, DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB

revision = "0001_reports"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "daily_reports",
        Column("report_date", Date, primary_key=True),
        Column("timezone", String(64), nullable=False),
        Column("mood", String(16), nullable=True),
        Column("thoughts", Text, nullable=True),
        Column("highlight", Text, nullable=True),
        Column("english_minutes", Integer, nullable=True),
        Column("english_details", Text, nullable=True),
        Column("reviewed_words", Integer, nullable=True),
        Column("sports_minutes", Integer, nullable=True),
        Column("sports_activity", String(300), nullable=True),
        Column("exercises", JSONB, nullable=False),
        Column("created_at", DateTime(timezone=True), nullable=False),
        Column("updated_at", DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("daily_reports")
