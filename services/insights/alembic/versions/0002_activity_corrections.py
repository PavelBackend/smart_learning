"""Track corrected and excluded attempts."""

import sqlalchemy as sa
from alembic import op

revision = "0002_activity_corrections"
down_revision = "0001_activity"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("activity", sa.Column("revision", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("activity", sa.Column("voided", sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade() -> None:
    op.drop_column("activity", "voided")
    op.drop_column("activity", "revision")
