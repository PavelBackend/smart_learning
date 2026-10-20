from shared.db import make_session_factory

from .config import get_settings

engine, SessionLocal = make_session_factory(get_settings().database_url)
