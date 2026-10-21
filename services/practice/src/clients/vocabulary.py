from __future__ import annotations

from uuid import UUID

import httpx
from pydantic import ValidationError

from shared.contracts.words import WordIds, WordList, WordRead
from shared.errors import DomainError

from ..config import get_settings


class VocabularyClient:
    def __init__(self):
        self.base_url = str(get_settings().vocabulary_url).rstrip("/")

    def list(self) -> list[WordRead]:
        try:
            response = httpx.get(f"{self.base_url}/words", params={"limit": 10000}, timeout=10)
            response.raise_for_status()
            return WordList.model_validate(response.json()).items
        except (httpx.HTTPError, ValidationError, ValueError) as exc:
            raise DomainError(503, "Vocabulary service is unavailable") from exc

    def ids(self) -> list[UUID]:
        try:
            response = httpx.get(f"{self.base_url}/words/ids", timeout=10)
            response.raise_for_status()
            return WordIds.model_validate(response.json()).ids
        except (httpx.HTTPError, ValidationError, ValueError) as exc:
            raise DomainError(503, "Vocabulary service is unavailable") from exc

    def batch(self, ids: list[UUID]) -> list[WordRead]:
        if not ids:
            return []
        try:
            response = httpx.post(
                f"{self.base_url}/words/batch",
                json={"ids": [str(word_id) for word_id in ids]},
                timeout=20,
            )
            response.raise_for_status()
            return WordList.model_validate(response.json()).items
        except (httpx.HTTPError, ValidationError, ValueError) as exc:
            raise DomainError(503, "Vocabulary service is unavailable") from exc

    def get(self, word_id: UUID) -> WordRead:
        try:
            response = httpx.get(f"{self.base_url}/words/{word_id}", timeout=10)
            if response.status_code == 404:
                raise DomainError(404, "Word not found")
            response.raise_for_status()
            return WordRead.model_validate(response.json())
        except (httpx.HTTPError, ValidationError, ValueError) as exc:
            raise DomainError(503, "Vocabulary service is unavailable") from exc

    def delete(self, word_id: UUID) -> None:
        try:
            response = httpx.delete(f"{self.base_url}/words/{word_id}", timeout=10)
            if response.status_code == 404:
                raise DomainError(404, "Word not found")
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise DomainError(503, "Vocabulary service is unavailable") from exc
