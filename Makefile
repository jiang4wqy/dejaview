# DejaView 一键命令。首次: make install; 起前后端: make dev
.PHONY: install test typecheck build check backend frontend dev run eval

install:
	python3 -m venv backend/.venv
	backend/.venv/bin/pip install -q -r backend/requirements-dev.txt
	cd frontend && npm ci

test:
	cd backend && ./.venv/bin/python -m pytest -q

typecheck:
	cd frontend && npm run typecheck

build:
	cd frontend && npm run build

check: test typecheck build

backend:
	cd backend && ./.venv/bin/uvicorn app.main:app --reload --port 8000

frontend:
	cd frontend && npm run dev

dev:
	bash scripts/dev.sh

run:
	cd backend && ./.venv/bin/python scripts/run_pipeline.py $(ARGS)

eval:
	cd backend && ./.venv/bin/python scripts/eval.py $(ARGS)
