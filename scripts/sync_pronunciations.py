"""Cache licensed US recordings from Wiktionary/Wikimedia Commons for local study.

Run after the application is up. The script resumes after interruption and never
downloads recordings without a Commons license accepted below.
"""

import argparse
import html
import json
import re
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode, urlparse
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "pronunciation"
WIKTIONARY_API = "https://en.wiktionary.org/w/api.php"
COMMONS_API = "https://commons.wikimedia.org/w/api.php"
USER_AGENT = "WordwellPersonalLearning/1.0 (https://github.com/PavelBackend/smart_learning)"
SUPPORTED = {".ogg": "audio/ogg", ".mp3": "audio/mpeg", ".wav": "audio/wav"}
AUDIO_PATTERN = re.compile(r"\{\{audio\|en\|([^|}]+)(?:\|([^}]*))?\}\}", re.IGNORECASE)


class RateLimited(Exception):
    pass


def request_bytes(url: str, attempts: int = 5) -> bytes:
    for attempt in range(attempts):
        try:
            with urlopen(Request(url, headers={"User-Agent": USER_AGENT}), timeout=35) as response:
                return response.read()
        except HTTPError as exc:
            if exc.code == 404:
                raise
            if exc.code == 429:
                raise RateLimited("Wikimedia asks us to slow down; resume later") from exc
            if exc.code not in (429, 500, 502, 503, 504) or attempt == attempts - 1:
                raise
        except (URLError, TimeoutError):
            if attempt == attempts - 1:
                raise
        time.sleep(min(2**attempt, 20))
    raise RuntimeError("Unreachable retry state")


def api_json(base: str, params: dict) -> dict:
    return json.loads(request_bytes(base + "?" + urlencode(params)).decode("utf-8"))


def english_source(wikitext: str) -> str:
    match = re.search(r"(?m)^==English==\s*$", wikitext)
    if not match:
        return ""
    remaining = wikitext[match.end() :]
    next_language = re.search(r"(?m)^==[^=\n]+==\s*$", remaining)
    return remaining[: next_language.start()] if next_language else remaining


def us_file(wikitext: str) -> str | None:
    for filename, options in AUDIO_PATTERN.findall(english_source(wikitext)):
        filename = filename.strip()
        if filename.lower().startswith("en-us-") or re.search(
            r"(?:^|\|)a\s*=\s*(?:us|usa|american)(?:\b|,)", options, re.I
        ):
            if Path(filename).suffix.lower() in SUPPORTED:
                return filename
    return None


def wiktionary_files(words: list[dict]) -> dict[str, str]:
    titles = [word["english"] for word in words]
    data = api_json(
        WIKTIONARY_API,
        {
            "action": "query",
            "prop": "revisions",
            "rvprop": "content",
            "rvslots": "main",
            "format": "json",
            "formatversion": "2",
            "redirects": "1",
            "titles": "|".join(titles),
        },
    )["query"]
    aliases = {
        item["from"].casefold(): item["to"].casefold()
        for item in data.get("redirects", []) + data.get("normalized", [])
    }
    pages = {page["title"].casefold(): page for page in data.get("pages", []) if not page.get("missing")}
    found = {}
    for word in words:
        title = word["english"].casefold()
        title = aliases.get(title, title)
        page = pages.get(title)
        if not page:
            continue
        source = page.get("revisions", [{}])[0].get("slots", {}).get("main", {}).get("content", "")
        filename = us_file(source)
        if filename:
            found[word["id"]] = filename
    return found


def clean_html(value: str) -> str:
    return html.unescape(re.sub(r"<[^>]+>", " ", value)).strip()


def licensed_record(filename: str, metadata: dict) -> dict | None:
    if "imageinfo" not in metadata:
        return None
    info = metadata["imageinfo"][0]
    ext = Path(filename).suffix.lower()
    url = info.get("url", "")
    if ext not in SUPPORTED or urlparse(url).hostname != "upload.wikimedia.org":
        return None
    meta = info.get("extmetadata", {})

    def value(name: str) -> str:
        return meta.get(name, {}).get("value", "")

    license_name = clean_html(value("LicenseShortName"))
    if not (license_name.upper().startswith(("CC BY", "CC0", "PUBLIC DOMAIN", "PD-"))):
        return None
    return {
        "url": url,
        "mime_type": SUPPORTED[ext],
        "source": "https://commons.wikimedia.org/wiki/File:" + quote(filename.replace(" ", "_")),
        "license": license_name,
        "license_url": value("LicenseUrl"),
        "artist": clean_html(value("Artist")),
    }


def commons_records(files: list[str]) -> dict[str, dict]:
    if not files:
        return {}
    data = api_json(
        COMMONS_API,
        {
            "action": "query",
            "prop": "imageinfo",
            "iiprop": "url|extmetadata",
            "format": "json",
            "formatversion": "2",
            "titles": "|".join("File:" + name for name in files),
        },
    )["query"]
    found = {}
    for page in data.get("pages", []):
        filename = page["title"].removeprefix("File:")
        record = licensed_record(filename, page)
        if record:
            found[filename.casefold()] = record
    return found


def valid_audio(content: bytes, extension: str) -> bool:
    return len(content) > 100 and (
        extension == ".ogg"
        and content.startswith(b"OggS")
        or extension == ".wav"
        and content.startswith(b"RIFF")
        or extension == ".mp3"
        and (content.startswith(b"ID3") or content[:1] == b"\xff")
    )


def write_json(path: Path, value: dict) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")
    temporary.replace(path)


def run(limit: int | None, retry_missing: bool, catalog_only: bool) -> None:
    DATA.mkdir(parents=True, exist_ok=True)
    index_path = DATA / "index.json"
    state_path = DATA / "sync_state.json"
    catalog_path = DATA / "catalog.json"
    scan_path = DATA / "catalog_scanned.json"
    index = json.loads(index_path.read_text(encoding="utf-8")) if index_path.exists() else {}
    state = json.loads(state_path.read_text(encoding="utf-8")) if state_path.exists() else {}
    catalog = json.loads(catalog_path.read_text(encoding="utf-8")) if catalog_path.exists() else {}
    scanned = (
        json.loads(scan_path.read_text(encoding="utf-8"))
        if scan_path.exists()
        else {word_id: True for word_id in set(state) | set(catalog)}
    )
    vocabulary = json.loads(request_bytes("http://localhost:8001/words?limit=10000"))
    words = vocabulary["items"]
    pending = [
        word
        for word in words
        if (word["id"] not in scanned if catalog_only else word["id"] not in index)
        and (catalog_only or retry_missing or word["id"] not in state)
    ]
    if limit is not None:
        pending = pending[:limit]
    print(f"Vocabulary: {len(words)}; cached: {len(index)}; pending: {len(pending)}", flush=True)
    for offset in range(0, len(pending), 20):
        batch = pending[offset : offset + 20]
        try:
            files = wiktionary_files(batch)
            records = commons_records(sorted(set(files.values())))
        except RateLimited as exc:
            print(str(exc), flush=True)
            break
        except (HTTPError, URLError, TimeoutError, ValueError, KeyError) as exc:
            print(f"Batch {offset // 20 + 1}: lookup failed: {exc}; will retry next run", flush=True)
            continue
        for word in batch:
            word_id = word["id"]
            scanned[word_id] = True
            filename = files.get(word_id)
            record = records.get(filename.casefold()) if filename else None
            if record:
                extension = Path(filename).suffix.lower()
                local_name = word_id + (".commons" if extension == ".wav" else "") + extension
                catalog[word_id] = {key: value for key, value in record.items() if key != "url"} | {
                    "word": word["english"],
                    "filename": local_name,
                    "download_url": record["url"],
                }
                if catalog_only:
                    continue
                try:
                    local_path = DATA / local_name
                    content = local_path.read_bytes() if local_path.exists() else request_bytes(record["url"])
                    if valid_audio(content, extension):
                        local_path.write_bytes(content)
                        index[word_id] = {key: value for key, value in record.items() if key != "url"} | {
                            "word": word["english"],
                            "filename": local_name,
                        }
                        state[word_id] = "cached"
                    else:
                        state[word_id] = "invalid_audio"
                except RateLimited as exc:
                    write_json(catalog_path, catalog)
                    write_json(index_path, index)
                    write_json(state_path, state)
                    print(str(exc), flush=True)
                    return
                except (HTTPError, URLError, TimeoutError) as exc:
                    print(f"{word['english']}: download failed: {exc}", flush=True)
                    continue
            else:
                state[word_id] = "no_licensed_us_recording"
        write_json(catalog_path, catalog)
        write_json(scan_path, scanned)
        write_json(index_path, index)
        write_json(state_path, state)
        print(
            f"Processed {min(offset + 20, len(pending))}/{len(pending)}; "
            f"licensed candidates: {len(catalog)}; recordings: {len(index)}",
            flush=True,
        )
        time.sleep(0.8)
    print(
        f"Done. Licensed candidates: {len(catalog)}; "
        f"downloaded: {len(index)} / {len(words)}; local US voice fills gaps.",
        flush=True,
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--retry-missing", action="store_true")
    parser.add_argument("--catalog-only", action="store_true")
    arguments = parser.parse_args()
    run(arguments.limit, arguments.retry_missing, arguments.catalog_only)
