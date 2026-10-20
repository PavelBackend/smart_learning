import re
import unicodedata


def normalize_answer(value: str) -> str:
    normalized = unicodedata.normalize("NFKC", value).casefold().replace("ё", "е")
    normalized = re.sub(r"[^\w\s-]", " ", normalized, flags=re.UNICODE)
    return " ".join(normalized.split())
