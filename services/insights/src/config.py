from functools import lru_cache

from shared.config import RabbitSettings, TimezoneSettings


@lru_cache
def get_settings() -> TimezoneSettings:
    return TimezoneSettings()


@lru_cache
def get_rabbit_settings() -> RabbitSettings:
    return RabbitSettings()
