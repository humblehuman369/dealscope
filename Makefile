# DealGapIQ developer tasks.
#
# Python 3.11 everywhere: it is what .github/workflows/ci.yml installs and what
# backend/pyproject.toml requires. A bare `python3` on stock macOS is 3.9 and
# will build a venv the backend cannot run, so the version is always explicit.
#
# The backend suite needs Postgres. `make test-db-up` starts one that mirrors
# CI's service, and the test targets point pytest at it.

BACKEND_VENV := backend/.venv
PY := $(BACKEND_VENV)/bin/python
TEST_DATABASE_URL := postgresql+psycopg://test:test@localhost:5433/test_db

.DEFAULT_GOAL := help

.PHONY: help setup setup-backend setup-frontend test-db-up test-db-down \
        test test-backend test-frontend lint typecheck theme check clean

help:
	@echo "Setup"
	@echo "  make setup           Install backend (Python 3.11) and frontend deps"
	@echo ""
	@echo "Test database (backend suite needs it)"
	@echo "  make test-db-up      Start postgres:16-alpine on :5433, same creds as CI"
	@echo "  make test-db-down    Stop and remove it"
	@echo ""
	@echo "Checks"
	@echo "  make test            Backend + frontend suites"
	@echo "  make lint            Ruff (critical rules, as CI) + ESLint"
	@echo "  make typecheck       Frontend tsc"
	@echo "  make theme           Theme surface audit"
	@echo "  make check           Everything above, the pre-deploy gate"
	@echo ""
	@echo "  make clean           Remove backend/.venv and frontend build output"

# --- setup -----------------------------------------------------------------

setup: setup-backend setup-frontend

# --seed installs pip into the venv. Without it, a later plain `pip install`
# inside the activated venv would fall through to the system Python's pip and
# install there instead — a silent, confusing mess.
$(BACKEND_VENV):
	@command -v uv >/dev/null 2>&1 || { \
		echo "uv not found. Install it with: brew install uv"; \
		echo "(or create the venv by hand: python3.11 -m venv $(BACKEND_VENV))"; \
		exit 1; }
	uv venv --python 3.11 --seed $(BACKEND_VENV)

setup-backend: $(BACKEND_VENV)
	@if command -v uv >/dev/null 2>&1; then \
		uv pip install --python $(PY) -r backend/requirements.txt; \
	else \
		$(PY) -m pip install -r backend/requirements.txt; \
	fi

setup-frontend:
	cd frontend && npm ci

# --- test database ---------------------------------------------------------

test-db-up:
	docker compose --profile test up -d --wait test-db

test-db-down:
	docker compose --profile test rm -sf test-db

# --- checks ----------------------------------------------------------------

test: test-backend test-frontend

# Without a reachable database the DB-backed tests error in fixture setup; the
# rest still run, so this stays useful even with no container runtime.
test-backend: $(BACKEND_VENV)
	cd backend && DATABASE_URL=$(TEST_DATABASE_URL) .venv/bin/python -m pytest -q --tb=short

test-frontend:
	cd frontend && npm run test:run

# Mirrors CI's critical-only gate. The full ruleset still has pre-existing
# style findings; see the note in .github/workflows/ci.yml.
lint: $(BACKEND_VENV)
	cd backend && .venv/bin/ruff check app tests --select E9,F63,F7,F82
	cd frontend && npm run lint

typecheck:
	cd frontend && npm run typecheck

theme:
	cd frontend && npm run theme:check

check: lint typecheck test theme

clean:
	rm -rf $(BACKEND_VENV) frontend/.next
