import json
from uuid import UUID

from pydantic import ValidationError

from shared.contracts.words import (
    ImportResult,
    WordBatchInput,
    WordExport,
    WordIds,
    WordImport,
    WordInput,
    WordList,
    WordRead,
)
from shared.errors import DomainError

from ..config import get_settings
from ..db import SessionLocal
from ..models import Word
from ..repositories.words import WordRepository


class WordService:
    def list(self, search: str, limit: int, offset: int) -> WordList:
        with SessionLocal() as session:
            words, total = WordRepository(session).list(search, limit, offset)
            return WordList(items=[WordRead.model_validate(word) for word in words], total=total)

    def get(self, word_id: UUID) -> WordRead:
        with SessionLocal() as session:
            word = WordRepository(session).get(word_id)
            if word is None:
                raise DomainError(404, "Word not found")
            return WordRead.model_validate(word)

    def ids(self) -> WordIds:
        with SessionLocal() as session:
            return WordIds(ids=WordRepository(session).ids())

    def batch(self, payload: WordBatchInput) -> WordList:
        with SessionLocal() as session:
            words = WordRepository(session).by_ids(payload.ids)
            return WordList(items=[WordRead.model_validate(word) for word in words], total=len(words))

    def create(self, payload: WordInput) -> WordRead:
        with SessionLocal.begin() as session:
            repository = WordRepository(session)
            key = payload.english.casefold()
            if repository.by_key(key):
                raise DomainError(409, "Word already exists")
            word = Word(english_key=key, **payload.model_dump())
            repository.add(word)
            session.flush()
            return WordRead.model_validate(word)

    def update(self, word_id: UUID, payload: WordInput) -> WordRead:
        with SessionLocal.begin() as session:
            repository = WordRepository(session)
            word = repository.get(word_id)
            if word is None:
                raise DomainError(404, "Word not found")
            key = payload.english.casefold()
            duplicate = repository.by_key(key)
            if duplicate and duplicate.id != word_id:
                raise DomainError(409, "Word already exists")
            for field, value in payload.model_dump().items():
                setattr(word, field, value)
            word.english_key = key
            session.flush()
            return WordRead.model_validate(word)

    def delete(self, word_id: UUID) -> None:
        with SessionLocal.begin() as session:
            repository = WordRepository(session)
            word = repository.get(word_id)
            if word is None:
                raise DomainError(404, "Word not found")
            repository.delete(word)

    def export(self) -> WordExport:
        with SessionLocal() as session:
            words = [
                WordInput.model_validate(
                    WordRead.model_validate(word).model_dump(exclude={"id", "created_at"})
                )
                for word in WordRepository(session).all()
            ]
            return WordExport(words=words)

    def import_file(self, filename: str | None, raw: bytes) -> ImportResult:
        if not filename or not filename.lower().endswith(".json"):
            raise DomainError(400, "Upload a .json file")
        max_bytes = get_settings().import_file_max_bytes
        if len(raw) > max_bytes:
            max_megabytes = max_bytes // 1_000_000
            raise DomainError(413, f"File is larger than {max_megabytes} MB")
        try:
            data = json.loads(raw)
            batch = WordImport.model_validate({"words": data} if isinstance(data, list) else data)
        except (ValueError, TypeError, ValidationError) as exc:
            raise DomainError(422, f"Invalid JSON: {exc}") from exc
        created = updated = 0
        with SessionLocal.begin() as session:
            repository = WordRepository(session)
            for payload in batch.words:
                key = payload.english.casefold()
                word = repository.by_key(key)
                if word:
                    for field, value in payload.model_dump().items():
                        setattr(word, field, value)
                    updated += 1
                else:
                    repository.add(Word(english_key=key, **payload.model_dump()))
                    session.flush()
                    created += 1
        return ImportResult(created=created, updated=updated, total=len(batch.words))
