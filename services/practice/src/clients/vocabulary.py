from uuid import UUID

import httpx
from pydantic import ValidationError

from shared.contracts.words import WordList, WordRead
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

    def get(self, word_id: UUID) -> WordRead:
        try:
            response = httpx.get(f"{self.base_url}/words/{word_id}", timeout=10)
            if response.status_code == 404:
                raise DomainError(404, "Word not found")
            response.raise_for_status()
            return WordRead.model_validate(response.json())
        except (httpx.HTTPError, ValidationError, ValueError) as exc:
            raise DomainError(503, "Vocabulary service is unavailable") from exc
