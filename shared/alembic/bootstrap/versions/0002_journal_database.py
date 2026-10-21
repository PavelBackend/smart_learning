"""Create the journal service database."""

from alembic import op
from sqlalchemy import text

revision = "0002_journal_database"
down_revision = "0001_service_databases"
branch_labels = None
depends_on = None


def upgrade() -> None:
    connection = op.get_bind()
    exists = connection.execute(
        text("SELECT 1 FROM pg_database WHERE datname = :name"), {"name": "journal"}
    ).scalar()
    if not exists:
        with op.get_context().autocommit_block():
            op.execute("CREATE DATABASE journal")


def downgrade() -> None:
    raise RuntimeError("Database deletion is intentionally manual to protect user data")
