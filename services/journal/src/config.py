from functools import lru_cache

from shared.config import DatabaseSettings


@lru_cache
def get_settings() -> DatabaseSettings:
    return DatabaseSettings()
