"""Remove only the old generated 'We talked about <word>.' examples.

Run without --apply to preview the count. Other examples and word fields are preserved.
"""

import argparse
import json
import os
from urllib.request import Request, urlopen

VOCABULARY_URL = os.getenv("VOCABULARY_URL", "http://localhost:8001").rstrip("/")
FIELDS = ("english", "translations", "examples", "part_of_speech", "note", "tags")


def is_placeholder(english: str, example: dict) -> bool:
    sentence = example["en"].strip().casefold()
    word = english.strip().casefold()
    return sentence in (f"we talked about {word}.", f"we talked about the {word}.")


def request_json(url: str, payload: dict | None = None) -> dict:
    body = json.dumps(payload, ensure_ascii=False).encode() if payload is not None else None
    headers = {"Content-Type": "application/json"} if body is not None else {}
    with urlopen(
        Request(url, data=body, headers=headers, method="PUT" if body else "GET"), timeout=25
    ) as response:
        return json.load(response)


def run(apply: bool) -> None:
    offset = 0
    found = changed = 0
    while True:
        batch = request_json(f"{VOCABULARY_URL}/words?limit=500&offset={offset}")
        for word in batch["items"]:
            examples = [
                example
                for example in word["examples"]
                if not is_placeholder(word["english"], example)
            ]
            removed = len(word["examples"]) - len(examples)
            if not removed:
                continue
            found += removed
            if apply:
                payload = {field: word[field] for field in FIELDS}
                payload["examples"] = examples
                request_json(f"{VOCABULARY_URL}/words/{word['id']}", payload)
                changed += 1
                if changed % 100 == 0:
                    print(f"Updated {changed} words", flush=True)
        offset += len(batch["items"])
        if offset >= batch["total"]:
            break
    print(f"Placeholder examples: {found}; words updated: {changed}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    run(parser.parse_args().apply)
