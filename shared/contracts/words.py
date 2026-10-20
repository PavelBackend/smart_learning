from datetime import datetime
from uuid import UUID

from pydantic import ConfigDict, Field, field_validator

from shared.schemas import StrictModel


class Example(StrictModel):
    en: str = Field(min_length=1, max_length=500)
    ru: str = Field(min_length=1, max_length=500)


class WordInput(StrictModel):
    english: str = Field(min_length=1, max_length=200)
    translations: list[str] = Field(min_length=1)
    examples: list[Example] = Field(default_factory=list)
    part_of_speech: str | None = Field(default=None, max_length=80)
    note: str | None = Field(default=None, max_length=1000)
    tags: list[str] = Field(default_factory=list)

    @field_validator("english")
    @classmethod
    def clean_english(cls, value: str) -> str:
        value = " ".join(value.split())
        if not value:
            raise ValueError("English word is empty")
        return value

    @field_validator("translations")
    @classmethod
    def clean_translations(cls, values: list[str]) -> list[str]:
        cleaned = list(dict.fromkeys(value.strip() for value in values if value.strip()))
        if not cleaned:
            raise ValueError("Translations cannot be empty")
        return cleaned

    @field_validator("tags")
    @classmethod
    def clean_tags(cls, values: list[str]) -> list[str]:
        return list(dict.fromkeys(value.strip() for value in values if value.strip()))


class WordRead(WordInput):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    created_at: datetime


class WordList(StrictModel):
    items: list[WordRead]
    total: int = Field(ge=0)


class WordExport(StrictModel):
    words: list[WordInput]


class WordImport(StrictModel):
    words: list[WordInput] = Field(min_length=1)


class ImportResult(StrictModel):
    created: int = Field(ge=0)
    updated: int = Field(ge=0)
    total: int = Field(ge=0)
