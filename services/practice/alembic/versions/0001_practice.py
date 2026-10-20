"""Create practice tables, or adopt the tables from the first local MVP."""

from alembic import op
from sqlalchemy import Boolean, Column, DateTime, Integer, String, UniqueConstraint, inspect
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "0001_practice"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    existing = set(inspect(op.get_bind()).get_table_names())
    if "progress" not in existing:
        op.create_table(
            "progress",
            Column("id", UUID(as_uuid=True), primary_key=True),
            Column("word_id", UUID(as_uuid=True), nullable=False),
            Column("direction", String(5), nullable=False),
            Column("stage", Integer, nullable=False),
            Column("correct_count", Integer, nullable=False),
            Column("wrong_count", Integer, nullable=False),
            Column("due_at", DateTime(timezone=True), nullable=False),
            Column("last_seen_at", DateTime(timezone=True), nullable=True),
            UniqueConstraint("word_id", "direction"),
        )
        op.create_index("ix_progress_word_id", "progress", ["word_id"])
    if "attempts" not in existing:
        op.create_table(
            "attempts",
            Column("id", UUID(as_uuid=True), primary_key=True),
            Column("word_id", UUID(as_uuid=True), nullable=False),
            Column("direction", String(5), nullable=False),
            Column("answer", String(500), nullable=False),
            Column("correct", Boolean, nullable=False),
            Column("created_at", DateTime(timezone=True), nullable=False),
        )
        op.create_index("ix_attempts_word_id", "attempts", ["word_id"])
    if "outbox" not in existing:
        op.create_table(
            "outbox",
            Column("id", UUID(as_uuid=True), primary_key=True),
            Column("routing_key", String(100), nullable=False),
            Column("payload", JSONB, nullable=False),
            Column("created_at", DateTime(timezone=True), nullable=False),
            Column("published_at", DateTime(timezone=True), nullable=True),
        )


def downgrade() -> None:
    op.drop_table("outbox")
    op.drop_index("ix_attempts_word_id", table_name="attempts")
    op.drop_table("attempts")
    op.drop_index("ix_progress_word_id", table_name="progress")
    op.drop_table("progress")
