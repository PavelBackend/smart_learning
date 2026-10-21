"""Persist study cohort and reversible attempts."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision = "0002_cohort_and_corrections"
down_revision = "0001_practice"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("attempts", sa.Column("revision", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("attempts", sa.Column("voided", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("attempts", sa.Column("stage_before", sa.Integer(), nullable=False, server_default="0"))
    op.create_table(
        "study_cohort",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("word_ids", JSONB(), nullable=False),
        sa.Column("requested_count", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("study_cohort")
    op.drop_column("attempts", "stage_before")
    op.drop_column("attempts", "voided")
    op.drop_column("attempts", "revision")
