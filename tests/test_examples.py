import unittest

from scripts.sync_examples import accepted_pair, select_examples


class ExampleSelectionTest(unittest.TestCase):
    def test_hyphenated_compound_is_not_target_word(self):
        item = {
            "id": 1,
            "text": 'The cock crows "Cock-a-doodle-doo!" in the morning.',
            "license": "CC BY 2.0 FR",
            "translations": [
                {"lang": "rus", "is_direct": True, "license": "CC BY 2.0 FR", "text": "Кукареку"}
            ],
        }
        self.assertIsNone(accepted_pair(item, "doodle"))
        item["text"] = "She drew a doodle in the margin."
        self.assertIsNotNone(accepted_pair(item, "doodle"))

    def test_examples_cover_distinct_listed_meanings(self):
        candidates = [
            {"en": "The bank lent money.", "ru": "Банк одолжил деньги."},
            {"en": "The bank closed early.", "ru": "Банк закрылся рано."},
            {"en": "We sat on the bank.", "ru": "Мы сидели на берегу."},
        ]
        selected = select_examples(candidates, ["банк", "берег"])
        self.assertEqual(len(selected), 3)
        self.assertIn("We sat on the bank.", [item["en"] for item in selected])

    def test_unlicensed_translation_is_rejected(self):
        item = {
            "id": 2,
            "text": "She drew a doodle in the margin.",
            "license": "CC BY 2.0 FR",
            "translations": [
                {"lang": "rus", "is_direct": True, "license": None, "text": "Она нарисовала каракули."}
            ],
        }
        self.assertIsNone(accepted_pair(item, "doodle"))
