from __future__ import annotations

from uuid import UUID

from sqlalchemy import String, func, select
from sqlalchemy.orm import Session

from ..models import Word


class WordRepository:
    def __init__(self, session: Session):
        self.session = session

    def list(self, search: str, limit: int, offset: int) -> tuple[list[Word], int]:
        query = select(Word)
        if search.strip():
            term = f"%{search.strip()}%"
            query = query.where(
                Word.english.ilike(term)
                | Word.translations.cast(String).ilike(term)
                | Word.tags.cast(String).ilike(term)
            )
        total = self.session.scalar(select(func.count()).select_from(query.subquery())) or 0
        words = self.session.scalars(
            query.order_by(Word.created_at.desc(), Word.id.desc()).offset(offset).limit(limit)
        ).all()
        return list(words), total

    def ids(self) -> list[UUID]:
        return list(self.session.scalars(select(Word.id)).all())

    def by_ids(self, ids: list[UUID]) -> list[Word]:
        if not ids:
            return []
        return list(self.session.scalars(select(Word).where(Word.id.in_(ids))).all())

    def all(self) -> list[Word]:
        return list(self.session.scalars(select(Word).order_by(Word.english)).all())

    def get(self, word_id: UUID) -> Word | None:
        return self.session.get(Word, word_id)

    def by_key(self, key: str) -> Word | None:
        return self.session.scalar(select(Word).where(Word.english_key == key))

    def add(self, word: Word) -> None:
        self.session.add(word)

    def delete(self, word: Word) -> None:
        self.session.delete(word)
