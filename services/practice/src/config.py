from functools import lru_cache

from pydantic import AnyHttpUrl

from shared.config import DatabaseSettings, RabbitSettings


class PracticeSettings(DatabaseSettings):
    vocabulary_url: AnyHttpUrl


@lru_cache
def get_settings() -> PracticeSettings:
    return PracticeSettings()


@lru_cache
def get_rabbit_settings() -> RabbitSettings:
    return RabbitSettings()
