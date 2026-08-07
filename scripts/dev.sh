#!/usr/bin/env bash
# 同时起后端(:8000) + 前端(:3000)。Ctrl-C 一起退出。
set -e
cd "$(dirname "$0")/.."
( cd backend && ./.venv/bin/uvicorn app.main:app --port 8000 ) &
BACK=$!
trap 'kill "$BACK" 2>/dev/null || true' EXIT INT TERM
echo "后端: http://localhost:8000/docs  |  前端启动中..."
cd frontend && npm run dev
