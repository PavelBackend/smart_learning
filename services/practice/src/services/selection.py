import random
from datetime import datetime
from uuid import UUID

from shared.contracts.words import WordRead

from ..models import Progress


def choose_word(words: list[WordRead], progress: dict[UUID, Progress], now: datetime) -> WordRead:
    weights = []
    for word in words:
        row = progress.get(word.id)
        if row is None:
            weight = 4.0
        else:
            weight = 1.0 / (row.stage + 1) ** 1.5
            weight *= 4 if row.due_at <= now else 0.1
            if row.last_seen_at and (now - row.last_seen_at).total_seconds() < 90:
                weight *= 0.05
        weights.append(max(weight, 0.001))
    return random.choices(words, weights=weights, k=1)[0]
