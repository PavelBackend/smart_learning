"""Create databases owned by the three services."""

from alembic import op
from sqlalchemy import text

revision = "0001_service_databases"
down_revision = None
branch_labels = None
depends_on = None

DATABASES = ("vocabulary", "practice", "insights")


def upgrade() -> None:
    connection = op.get_bind()
    missing = [
        name
        for name in DATABASES
        if not connection.execute(
            text("SELECT 1 FROM pg_database WHERE datname = :name"), {"name": name}
        ).scalar()
    ]
    if missing:
        with op.get_context().autocommit_block():
            for name in missing:
                op.execute(f"CREATE DATABASE {name}")


def downgrade() -> None:
    raise RuntimeError("Database deletion is intentionally manual to protect user data")
