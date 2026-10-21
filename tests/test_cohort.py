"""Scheduling scenarios without writing to the user's PostgreSQL database."""

import os
import unittest
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import patch
from uuid import uuid4


class FakeSession:
    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    @classmethod
    def begin(cls):
        return cls()


class FakeVocabulary:
    def __init__(self, words):
        self.words = words

    def ids(self):
        return list(self.words)

    def batch(self, ids):
        return [self.words[word_id] for word_id in ids if word_id in self.words]


class FakeRepository:
    def __init__(self, word_id, now):
        self.current = SimpleNamespace(word_ids=[str(word_id)], requested_count=1)
        self.rows = [
            SimpleNamespace(
                word_id=word_id,
                direction=direction,
                stage=1,
                due_at=now + timedelta(days=1),
                last_seen_at=None,
            )
            for direction in ("en_ru", "ru_en")
        ]

    def cohort(self, *, lock=False):
        return self.current

    def all_progress(self):
        return self.rows

    def progress_for_direction(self, direction):
        return [row for row in self.rows if row.direction == direction]


class CohortSchedulingTest(unittest.TestCase):
    def test_can_add_after_todays_cards_and_old_due_cards_return(self):
        os.environ.setdefault("DATABASE_URL", "postgresql+psycopg://test:test@localhost/test")
        os.environ.setdefault("VOCABULARY_URL", "http://localhost:8001")
        from services.practice.src.schemas import CohortInput
        from services.practice.src.services import cohort as module

        now = datetime.now(timezone.utc)
        first, second = uuid4(), uuid4()
        words = {
            word_id: SimpleNamespace(
                id=word_id,
                english=f"word-{index}",
                translations=[f"перевод-{index}"],
                part_of_speech=None,
            )
            for index, word_id in enumerate((first, second))
        }
        repository = FakeRepository(first, now)
        vocabulary = FakeVocabulary(words)
        with (
            patch.object(module, "SessionLocal", FakeSession),
            patch.object(module, "PracticeRepository", lambda _session: repository),
            patch.object(module, "VocabularyClient", lambda: vocabulary),
        ):
            service = module.CohortService()
            self.assertTrue(service.read().can_add)
            expanded = service.expand(CohortInput(count=1))
            self.assertEqual(expanded.count, 2)
            self.assertEqual(service.next_question("en_ru").word_id, second)

            # The old word remains eligible even after it leaves the active selection.
            repository.current.word_ids = [str(second)]
            repository.rows[0].due_at = now - timedelta(minutes=1)
            repository.rows.append(
                SimpleNamespace(
                    word_id=second,
                    direction="en_ru",
                    stage=1,
                    due_at=now + timedelta(days=1),
                    last_seen_at=None,
                )
            )
            self.assertEqual(service.next_question("en_ru").word_id, first)


if __name__ == "__main__":
    unittest.main()
