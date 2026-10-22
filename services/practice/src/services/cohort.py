from datetime import datetime, timezone
from random import sample, shuffle
from uuid import UUID

from shared.contracts.events import Direction
from shared.errors import DomainError

from ..clients.vocabulary import VocabularyClient
from ..db import SessionLocal
from ..models import Progress, StudyCohort
from ..repositories.practice import PracticeRepository
from ..schemas import CohortInput, CohortRead, Question, QuestionList

LEVEL_TO_CONTINUE = 2  # UI level 3; the next review is in three days.
DIRECTIONS: tuple[Direction, Direction] = ("en_ru", "ru_en")


def _levels(rows: list[Progress]) -> dict[tuple[UUID, Direction], Progress]:
    return {(row.word_id, row.direction): row for row in rows}


def _mastered(word_id: UUID, progress: dict[tuple[UUID, Direction], Progress]) -> bool:
    return all(
        progress.get((word_id, direction)) is not None
        and progress[(word_id, direction)].stage >= LEVEL_TO_CONTINUE
        for direction in DIRECTIONS
    )


def _due(
    word_id: UUID,
    direction: Direction,
    active: set[UUID],
    progress: dict[tuple[UUID, Direction], Progress],
    now: datetime,
) -> bool:
    row = progress.get((word_id, direction))
    return (word_id in active and row is None) or (row is not None and row.due_at <= now)


class CohortService:
    def __init__(self):
        self.vocabulary = VocabularyClient()

    def read(self) -> CohortRead:
        valid_ids = set(self.vocabulary.ids())
        now = datetime.now(timezone.utc)
        with SessionLocal() as session:
            repository = PracticeRepository(session)
            cohort = repository.cohort()
            active = {UUID(value) for value in cohort.word_ids} & valid_ids if cohort else set()
            progress = _levels(repository.all_progress())
            remaining = sum(not _mastered(word_id, progress) for word_id in active)
            available = sum(
                not _mastered(word_id, progress) and word_id not in active for word_id in valid_ids
            )
            due = {
                direction: sum(
                    _due(word_id, direction, active, progress, now)
                    for word_id in active | {key[0] for key in progress}
                    if word_id in valid_ids
                )
                for direction in DIRECTIONS
            }
            active_due = any(
                _due(word_id, direction, active, progress, now)
                for word_id in active
                for direction in DIRECTIONS
            )
            return CohortRead(
                count=len(active),
                remaining=remaining,
                ready=remaining == 0,
                available=available,
                due_en_ru=due["en_ru"],
                due_ru_en=due["ru_en"],
                can_add=bool(active) and available > 0 and not active_due,
            )

    def _choose_new(
        self,
        all_ids: list[UUID],
        active: set[UUID],
        progress: dict[tuple[UUID, Direction], Progress],
        count: int,
    ) -> list[str]:
        eligible = [
            word_id for word_id in all_ids if word_id not in active and not _mastered(word_id, progress)
        ]
        unseen = [
            word_id
            for word_id in eligible
            if all((word_id, direction) not in progress for direction in DIRECTIONS)
        ]
        chosen = sample(unseen, min(count, len(unseen)))
        if len(chosen) < count:
            remaining = [word_id for word_id in eligible if word_id not in chosen]
            chosen += sample(remaining, min(count - len(chosen), len(remaining)))
        return [str(word_id) for word_id in chosen]

    def start(self, payload: CohortInput) -> CohortRead:
        all_ids = self.vocabulary.ids()
        with SessionLocal.begin() as session:
            repository = PracticeRepository(session)
            current = repository.cohort(lock=True)
            progress = _levels(repository.all_progress())
            if current and any(not _mastered(UUID(value), progress) for value in current.word_ids):
                raise DomainError(409, "Сначала доведи текущую подборку до уровня 3 в обоих направлениях")
            chosen = self._choose_new(all_ids, set(), progress, payload.count)
            if not chosen:
                raise DomainError(409, "Новых слов пока нет")
            if current is None:
                session.add(StudyCohort(id=1, word_ids=chosen, requested_count=payload.count))
            else:
                current.word_ids = chosen
                current.requested_count = payload.count
                current.created_at = datetime.now(timezone.utc)
        return self.read()

    def expand(self, payload: CohortInput) -> CohortRead:
        all_ids = self.vocabulary.ids()
        now = datetime.now(timezone.utc)
        with SessionLocal.begin() as session:
            repository = PracticeRepository(session)
            current = repository.cohort(lock=True)
            if current is None:
                raise DomainError(409, "Сначала создай подборку")
            active = {UUID(value) for value in current.word_ids}
            progress = _levels(repository.all_progress())
            if any(
                _due(word_id, direction, active, progress, now)
                for word_id in active
                for direction in DIRECTIONS
            ):
                raise DomainError(409, "Сначала ответь на доступные карточки в обоих направлениях")
            chosen = self._choose_new(all_ids, active, progress, payload.count)
            if not chosen:
                raise DomainError(409, "Новых слов пока нет")
            current.word_ids = [*current.word_ids, *chosen]
            current.requested_count += len(chosen)
        return self.read()

    def questions(self, direction: Direction) -> QuestionList:
        now = datetime.now(timezone.utc)
        with SessionLocal() as session:
            repository = PracticeRepository(session)
            cohort = repository.cohort()
            if cohort is None:
                raise DomainError(409, "Выбери количество слов для подборки")
            active = {UUID(value) for value in cohort.word_ids}
            rows = repository.progress_for_direction(direction)
            progress = {row.word_id: row for row in rows}
            due_ids = {
                word_id for word_id in active if word_id not in progress or progress[word_id].due_at <= now
            }
            due_ids.update(row.word_id for row in rows if row.due_at <= now)
            words = self.vocabulary.batch(list(due_ids))
            shuffle(words)
            return QuestionList(items=[
                Question(
                    word_id=word.id,
                    english=word.english,
                    direction=direction,
                    prompt=word.english if direction == "en_ru" else word.translations[0],
                    part_of_speech=word.part_of_speech,
                    stage=progress[word.id].stage if word.id in progress else 0,
                )
                for word in words
            ])

    def next_question(self, direction: Direction) -> Question:
        questions = self.questions(direction).items
        if not questions:
            raise DomainError(404, "Все карточки в этом направлении отложены до следующего повтора")
        return questions[0]
