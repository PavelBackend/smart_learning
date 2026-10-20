from services.insights.src.models import Base
from shared.alembic.runtime import run_migrations

run_migrations("DATABASE_URL", Base.metadata)
