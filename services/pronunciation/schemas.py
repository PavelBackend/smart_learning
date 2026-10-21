from pathlib import Path

from pydantic import AnyHttpUrl, field_validator

from shared.schemas import StrictModel


class AudioRecord(StrictModel):
    word: str
    filename: str
    mime_type: str
    source: AnyHttpUrl
    license: str
    license_url: AnyHttpUrl | None
    artist: str

    @field_validator("license_url", mode="before")
    @classmethod
    def blank_license_url(cls, value: str | None) -> str | None:
        return value or None

    @field_validator("filename")
    @classmethod
    def filename_only(cls, value: str) -> str:
        if Path(value).name != value:
            raise ValueError("Filename must not contain a path")
        return value


class AudioSource(StrictModel):
    word: str
    source: AnyHttpUrl
    license: str
    license_url: AnyHttpUrl | None
    artist: str
