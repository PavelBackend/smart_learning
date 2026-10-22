"""A retry grades an answer without writing another attempt or changing progress."""

import os
import unittest
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import patch
from uuid import uuid4


class FakeSession:
    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False


class ReviewRoundTest(unittest.TestCase):
    def test_review_only_keeps_progress_and_does_not_record_attempt(self):
        os.environ.setdefault("DATABASE_URL", "postgresql+psycopg://test:test@localhost/test")
        os.environ.setdefault("VOCABULARY_URL", "http://localhost:8001")
        from services.practice.src.schemas import AnswerInput
        from services.practice.src.services import practice as module

        word_id = uuid4()
        due = datetime.now(timezone.utc)
        row = SimpleNamespace(stage=2, due_at=due)

        class FakeRepository:
            def __init__(self, _session):
                pass

            def locked_progress(self, _word_id, _direction):
                return row

            def __getattr__(self, name):
                raise AssertionError(f"Unexpected write in review: {name}")

        vocabulary = SimpleNamespace(
            get=lambda _id: SimpleNamespace(english="doodle", translations=["каракули"], examples=[])
        )
        with (
            patch.object(module, "SessionLocal", FakeSession),
            patch.object(module, "PracticeRepository", FakeRepository),
            patch.object(module, "VocabularyClient", lambda: vocabulary),
        ):
            result = module.PracticeService().answer(
                AnswerInput(word_id=word_id, direction="en_ru", answer="каракули", review_only=True)
            )
        self.assertTrue(result.correct)
        self.assertIsNone(result.attempt_id)
        self.assertEqual(result.stage, 2)
        self.assertEqual(result.due_at, due)
