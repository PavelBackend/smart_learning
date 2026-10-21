from functools import lru_cache

from shared.config import DatabaseSettings, RabbitSettings


@lru_cache
def get_settings() -> DatabaseSettings:
    return DatabaseSettings()


@lru_cache
def get_rabbit_settings() -> RabbitSettings:
    return RabbitSettings()
