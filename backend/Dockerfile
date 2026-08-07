FROM python:3.12-slim

# git: 内置 repo map 需要 shallow clone
RUN apt-get update && apt-get install -y --no-install-recommends git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY scripts ./scripts
COPY pyproject.toml .

EXPOSE 8000
# 用 $PORT(云平台如 Render 会注入; 本地/compose 缺省 8000), shell 形式才能展开变量
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
