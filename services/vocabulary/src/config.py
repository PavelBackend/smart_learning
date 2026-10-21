from functools import lru_cache

from pydantic import Field

from shared.config import DatabaseSettings


class VocabularySettings(DatabaseSettings):
    import_file_max_bytes: int = Field(
        default=20_000_000,
        ge=1_000_000,
        le=100_000_000,
    )


@lru_cache
def get_settings() -> VocabularySettings:
    return VocabularySettings()
