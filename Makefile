.PHONY: up infra build migrate down logs lock lock-dev check audio

COMPOSE := docker compose
PIP_COMPILE ?= .venv/bin/pip-compile
PRE_COMMIT ?= .venv/bin/pre-commit

up: migrate
	$(COMPOSE) up -d --wait
	@powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$$(wslpath -w scripts/Backup-Wordwell.ps1)" -InstallSchedule
	@port="$$( $(COMPOSE) port frontend 80 | sed 's/.*://')"; printf '\nWordwell готов: http://localhost:%s\n' "$$port"

infra:
	$(COMPOSE) up -d --wait postgres rabbitmq

build: infra
	$(COMPOSE) build vocabulary practice practice-publisher insights insights-worker journal pronunciation frontend

migrate: build
	$(COMPOSE) run --rm --no-deps vocabulary alembic -c shared/alembic/bootstrap.ini upgrade head
	$(COMPOSE) run --rm --no-deps vocabulary alembic -c services/vocabulary/alembic.ini upgrade head
	$(COMPOSE) run --rm --no-deps practice alembic -c services/practice/alembic.ini upgrade head
	$(COMPOSE) run --rm --no-deps insights alembic -c services/insights/alembic.ini upgrade head
	$(COMPOSE) run --rm --no-deps journal alembic -c services/journal/alembic.ini upgrade head

down:
	$(COMPOSE) down

logs:
	$(COMPOSE) logs -f

lock:
	$(PIP_COMPILE) --resolver=backtracking --output-file=requirements.txt requirements.in

lock-dev:
	$(PIP_COMPILE) --resolver=backtracking --output-file=requirements-dev.txt requirements-dev.in

check:
	$(PRE_COMMIT) run --all-files

audio:
	@powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$$(wslpath -w scripts/Generate-UsAudio.ps1)"
