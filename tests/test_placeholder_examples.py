import unittest

from scripts.remove_placeholder_examples import is_placeholder


class PlaceholderExamplesTest(unittest.TestCase):
    def test_exact_generated_sentence_only(self):
        self.assertTrue(is_placeholder("crux", {"en": "We talked about crux."}))
        self.assertFalse(is_placeholder("crux", {"en": "We talked about the crux of the issue."}))
        self.assertFalse(is_placeholder("crux", {"en": "We talked about music."}))
