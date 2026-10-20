"""Create vocabulary tables, or adopt the tables from the first local MVP."""

from alembic import op
from sqlalchemy import Column, DateTime, String, inspect
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "0001_words"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    if inspect(op.get_bind()).has_table("words"):
        return
    op.create_table(
        "words",
        Column("id", UUID(as_uuid=True), primary_key=True),
        Column("english", String(200), nullable=False),
        Column("english_key", String(200), nullable=False),
        Column("translations", JSONB, nullable=False),
        Column("examples", JSONB, nullable=False),
        Column("part_of_speech", String(80), nullable=True),
        Column("note", String(1000), nullable=True),
        Column("tags", JSONB, nullable=False),
        Column("created_at", DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_words_english_key", "words", ["english_key"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_words_english_key", table_name="words")
    op.drop_table("words")
