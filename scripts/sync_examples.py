"""Enrich vocabulary with attributed EN/RU sentence pairs from Tatoeba.

The Tatoeba API returns each sentence's license and contributor. This job is
resumable and only adds examples; it does not alter translations or user notes.
"""

import argparse
import json
import os
import re
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
STATE = ROOT / "data" / "enrichment" / "examples_state.json"
VOCABULARY_URL = os.getenv("VOCABULARY_URL", "http://localhost:8001").rstrip("/")
TATOEBA_URL = "https://api.tatoeba.org/v1/sentences"
USER_AGENT = "WordwellPersonalLearning/1.0 (https://github.com/PavelBackend/smart_learning)"
LICENSES = {"CC BY 2.0 FR", "CC0 1.0"}


def request_json(url: str, payload: dict | None = None) -> dict | list:
    data = json.dumps(payload, ensure_ascii=False).encode() if payload is not None else None
    headers = {"User-Agent": USER_AGENT}
    if data is not None:
        headers["Content-Type"] = "application/json"
    with urlopen(
        Request(url, data=data, headers=headers, method="PATCH" if data else "GET"), timeout=25
    ) as response:
        return json.load(response)


def vocabulary_words() -> list[dict]:
    words = []
    while True:
        result = request_json(f"{VOCABULARY_URL}/words?limit=500&offset={len(words)}")
        words.extend(result["items"])
        if len(words) >= result["total"]:
            return words


def accepted_pair(item: dict, english: str) -> dict | None:
    sentence = item.get("text", "").strip()
    # A hyphenated compound such as cock-a-doodle-doo is not an example of doodle.
    if not re.search(rf"(?<![\w-]){re.escape(english)}(?![\w-])", sentence, re.IGNORECASE):
        return None
    if not 4 <= len(sentence.split()) <= 22 or len(sentence) > 500:
        return None
    if item.get("is_unapproved") or item.get("license") not in LICENSES:
        return None
    russian = next(
        (
            translation
            for translation in item.get("translations", [])
            if translation.get("lang") == "rus"
            and translation.get("is_direct")
            and not translation.get("is_unapproved")
            and translation.get("license") in LICENSES
            and 0 < len(translation.get("text", "")) <= 500
        ),
        None,
    )
    if russian is None:
        return None
    return {
        "en": sentence,
        "ru": russian["text"].strip(),
        "source_url": f"https://tatoeba.org/en/sentences/show/{item['id']}",
        "license": item["license"],
        "attribution": f"Tatoeba: {item.get('owner') or 'anonymous'} / {russian.get('owner') or 'anonymous'}",
    }


def score(example: dict, translations: list[str]) -> tuple[int, int]:
    russian = example["ru"].casefold()
    matches = sum(
        any(token[:4] in russian for token in re.findall(r"[а-яё]{4,}", value.casefold()))
        for value in translations
    )
    return matches, -len(example["en"])


def select_examples(candidates: list[dict], translations: list[str]) -> list[dict]:
    unique = {pair["en"].casefold(): pair for pair in candidates}
    ranked = sorted(unique.values(), key=lambda pair: score(pair, translations), reverse=True)
    selected = []
    used_english = set()
    used_russian = set()

    def add(pair: dict) -> bool:
        english = pair["en"].casefold()
        russian = re.sub(r"[^а-яё]+", " ", pair["ru"].casefold()).strip()
        if english in used_english or russian in used_russian or len(selected) == 3:
            return False
        selected.append(pair)
        used_english.add(english)
        used_russian.add(russian)
        return True

    for translation in translations:
        tokens = re.findall(r"[а-яё]{4,}", translation.casefold())
        for pair in ranked:
            if any(token[:4] in pair["ru"].casefold() for token in tokens) and add(pair):
                break
    for pair in ranked:
        add(pair)
    return selected


def find_examples(word: dict) -> list[dict]:
    english = word["english"].strip()
    if not re.fullmatch(r"[A-Za-z][A-Za-z '\-]{0,100}", english):
        return []
    query = urlencode(
        {
            "lang": "eng",
            "q": english,
            "trans:lang": "rus",
            "showtrans:lang": "rus",
            "sort": "relevance",
            "limit": 70,
        }
    )
    result = request_json(f"{TATOEBA_URL}?{query}")
    candidates = [pair for item in result.get("data", []) if (pair := accepted_pair(item, english))]
    return select_examples(candidates, word["translations"])


def save_state(state: dict) -> None:
    STATE.parent.mkdir(parents=True, exist_ok=True)
    temporary = STATE.with_suffix(".tmp")
    temporary.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")
    temporary.replace(STATE)


def run(limit: int, dry_run: bool, retry_missing: bool) -> None:
    state = json.loads(STATE.read_text(encoding="utf-8")) if STATE.exists() else {}
    pending = [
        word
        for word in vocabulary_words()
        if word["id"] not in state or retry_missing and state[word["id"]] == "missing"
    ][:limit]
    print(f"Example enrichment: {len(pending)} words in this run", flush=True)
    for index, word in enumerate(pending, 1):
        try:
            examples = find_examples(word)
            if dry_run:
                print(
                    json.dumps({"word": word["english"], "examples": examples}, ensure_ascii=False, indent=2)
                )
                continue
            if examples:
                request_json(f"{VOCABULARY_URL}/words/{quote(word['id'])}/examples", {"examples": examples})
            state[word["id"]] = "found" if examples else "missing"
            save_state(state)
            print(f"{index}/{len(pending)} {word['english']}: {len(examples)} examples", flush=True)
        except HTTPError as exc:
            print(f"{word['english']}: HTTP {exc.code}; resume next run", flush=True)
            if exc.code == 429:
                break
        except (URLError, TimeoutError, ValueError, KeyError) as exc:
            print(f"{word['english']}: {exc}; resume next run", flush=True)
        time.sleep(0.4)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=100)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--retry-missing", action="store_true")
    args = parser.parse_args()
    run(args.limit, args.dry_run, args.retry_missing)
