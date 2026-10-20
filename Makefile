.PHONY: up infra build migrate down logs lock lock-dev check

COMPOSE := docker compose
PIP_COMPILE ?= .venv/bin/pip-compile
PRE_COMMIT ?= .venv/bin/pre-commit

up: migrate
	$(COMPOSE) up -d --wait
	@port="$$( $(COMPOSE) port frontend 80 | sed 's/.*://')"; printf '\nWordwell готов: http://localhost:%s\n' "$$port"

infra:
	$(COMPOSE) up -d --wait postgres rabbitmq

build: infra
	$(COMPOSE) build vocabulary practice practice-publisher insights insights-worker frontend

migrate: build
	$(COMPOSE) run --rm --no-deps vocabulary alembic -c shared/alembic/bootstrap.ini upgrade head
	$(COMPOSE) run --rm --no-deps vocabulary alembic -c services/vocabulary/alembic.ini upgrade head
	$(COMPOSE) run --rm --no-deps practice alembic -c services/practice/alembic.ini upgrade head
	$(COMPOSE) run --rm --no-deps insights alembic -c services/insights/alembic.ini upgrade head

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
