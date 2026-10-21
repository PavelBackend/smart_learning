# Архитектура и правила обучения

## Сервисы

`frontend` — React/TypeScript, nginx проксирует `/api`. `vocabulary` владеет карточками и импортом/экспортом. `practice` владеет подборкой, прогрессом, ответами и событиями. `insights` строит статистику из RabbitMQ событий; `journal` хранит дневные отчёты; `pronunciation` отдаёт локальные американские аудиофайлы. У каждого пишущего сервиса своя PostgreSQL база. HTTP контракты лежат в `shared/contracts`, FastAPI/Pydantic проверяют ввод.

При верном ответе уровень направления повышается на 1 (максимум 6), интервалы повторения: 1, 3, 7, 14, 30, 60 дней. Ошибка возвращает уровень 0 и делает карточку доступной сразу. Ручное признание ответа верным или исправление перевода переоценивает последнюю попытку; удаление слова исключает её из статистики через событие.

Подборка (`StudyCohort`) хранит активные UUID. Новая подборка разрешена, когда каждое активное слово достигло уровня 3 (`stage >= 2`) в обоих направлениях. Если все активные карточки обоих направлений отложены, `/practice/cohort/expand` добавляет случайные слова к текущей подборке. Прогресс не удаляется при смене подборки: просроченные карточки из прежних подборок также попадают в `/practice/next`. Неизученные слова вне активной подборки не выдаются. Для выбора новых слов приоритет имеют слова без прогресса.

Словарь выдаётся через `/words?limit=&offset=&search=`. Клиент запрашивает 24 карточки на страницу и только их прогресс через `/practice/progress/batch`; сводка получает только UUID карточек. Стабильная сортировка: дата создания и UUID по убыванию. Поиск включает английский, переводы и теги. Экспорт специально читает весь словарь.

## Где менять поведение

- Словарь: `services/vocabulary/src/{api,services,repositories}/words.py`, `shared/contracts/words.py`, `frontend/src/pages/Dictionary.tsx`.
- Практика: `services/practice/src/services/{cohort,practice,selection}.py`, `services/practice/src/api/practice.py`, `frontend/src/pages/Practice.tsx`, `frontend/src/components/practice`.
- Миграции: `services/<name>/alembic/versions`, общий bootstrap баз: `shared/alembic/bootstrap/versions`.
- Запуск: `docker-compose.yml`, `Makefile`; стили тем: `frontend/src/styles/themes.css`.

## Проверка изменений

`make up`, `.venv/bin/ruff check shared services tests`, `.venv/bin/python -m unittest discover -s tests -v`, `cd frontend && npm run build`. Через `/api/words?limit=24&offset=0` проверь размер страницы и `total`; через `/api/practice/cohort` — возможность добавления и счётчики направлений. Для тестов записи используй временные карточки и очищай их после проверки; реальные данные пользователя не изменяй.
