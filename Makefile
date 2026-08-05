# DejaView 一键命令。首次: make install; 起前后端: make dev
.PHONY: install test backend frontend dev run

install:
	python3 -m venv backend/.venv
	backend/.venv/bin/pip install -q -r backend/requirements.txt
	cd frontend && npm install

test:
	cd backend && ./.venv/bin/python -m pytest -q

backend:
	cd backend && ./.venv/bin/uvicorn app.main:app --reload --port 8000

frontend:
	cd frontend && npm run dev

dev:
	bash scripts/dev.sh

run:
	cd backend && ./.venv/bin/python scripts/run_pipeline.py $(ARGS)
