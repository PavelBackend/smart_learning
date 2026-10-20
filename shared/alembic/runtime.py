import os

from alembic import context
from sqlalchemy import create_engine
from sqlalchemy.pool import NullPool


def run_migrations(env_var: str, metadata=None) -> None:
    url = os.environ[env_var]
    engine = create_engine(url, poolclass=NullPool)
    try:
        with engine.connect() as connection:
            context.configure(connection=connection, target_metadata=metadata)
            with context.begin_transaction():
                context.run_migrations()
    finally:
        engine.dispose()
