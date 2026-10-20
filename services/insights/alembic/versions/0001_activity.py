"""Create activity table, or adopt the table from the first local MVP."""

from alembic import op
from sqlalchemy import Boolean, Column, Date, DateTime, String, inspect
from sqlalchemy.dialects.postgresql import UUID

revision = "0001_activity"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    if inspect(op.get_bind()).has_table("activity"):
        return
    op.create_table(
        "activity",
        Column("event_id", UUID(as_uuid=True), primary_key=True),
        Column("word_id", UUID(as_uuid=True), nullable=False),
        Column("direction", String(5), nullable=False),
        Column("correct", Boolean, nullable=False),
        Column("day", Date, nullable=False),
        Column("occurred_at", DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_activity_word_id", "activity", ["word_id"])
    op.create_index("ix_activity_day", "activity", ["day"])


def downgrade() -> None:
    op.drop_index("ix_activity_day", table_name="activity")
    op.drop_index("ix_activity_word_id", table_name="activity")
    op.drop_table("activity")
