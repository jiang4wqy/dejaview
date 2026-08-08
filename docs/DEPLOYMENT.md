# Deployment Guide

[中文 README](../README.md) · [Architecture](ARCHITECTURE.md) · [Security policy](../SECURITY.md)

DejaView supports zero-cost local mock mode, a real-provider development mode, Docker Compose for a server, and a two-service Render Blueprint.

## 1. Local mock mode

No `.env` file or API key is required.

Backend:

```bash
cd backend
python -m venv .venv
./.venv/bin/python -m pip install -r requirements-dev.txt
./.venv/bin/python -m uvicorn app.main:app --reload --port 8000
```

Windows PowerShell uses `.\.venv\Scripts\python.exe` in place of `./.venv/bin/python`.

Frontend, in another terminal:

```bash
cd frontend
npm ci
npm run dev
```

Open `http://localhost:3000`. The Next.js `/api` route proxies to `http://localhost:8000` by default.

## 2. Local real-provider mode

```bash
cp backend/.env.example backend/.env
```

Edit the copied file and enable one provider. The file is ignored by Git. Never put a real key in `.env.example`, a frontend variable, a command pasted into an Issue, or a screenshot.

Common variables:

| Variable | Purpose | Safe default |
|---|---|---|
| `DEJAVIEW_PROVIDER` | `mock`, `deepseek`, `claude`, or `qwen` | `mock` |
| `DEEPSEEK_API_KEY` / `ANTHROPIC_API_KEY` | Server-side model credentials | unset |
| `DEJAVIEW_CRAWLER` | `stub`, `builtin`, or another registered crawler | `stub` locally |
| `DEJAVIEW_REPOMAP` | `stub`, `builtin`, or another registered mapper | `stub` locally |
| `DEJAVIEW_SEARCH_PROVIDER` | `mock`, `github`, `composite`, and registered sources | `mock` locally |
| `DEJAVIEW_ACCESS_CODE` | Optional shared gate for job and report endpoints | disabled |
| `DEJAVIEW_CORS_ORIGINS` | Comma-separated direct browser origins | local frontend origins |
| `DEJAVIEW_TRUSTED_PROXIES` | Proxy IP/CIDR allowed to supply client IP | empty |
| `DEJAVIEW_RATE_LIMIT_*` | Per-IP and global cost caps | disabled locally |

## 3. Docker Compose on a server

Requirements: Docker Engine with the Compose plugin, a model account for real mode, and inbound access to port `3000` or a reverse proxy.

```bash
cp deploy.env.example .env
```

Edit `.env`:

1. Replace the model-key placeholder.
2. Replace `DEJAVIEW_ACCESS_CODE` with a strong shared code for public deployments.
3. Review hourly and daily limits against your model budget.
4. Keep `DEJAVIEW_TRUSTED_PROXIES` empty unless a known proxy overwrites `X-Forwarded-For`.

Validate and start:

```bash
docker compose config --quiet
docker compose up -d --build
docker compose ps
```

Open `http://SERVER_IP:3000`. Compose publishes only frontend port `3000`; the API, worker, Redis and optional Postgres services stay on the internal network.

To run Compose without paid model calls, set:

```dotenv
DEJAVIEW_PROVIDER=mock
DEJAVIEW_CRAWLER=stub
DEJAVIEW_REPOMAP=stub
DEJAVIEW_SEARCH_PROVIDER=mock
```

`deploy.sh` only requires a DeepSeek key when `DEJAVIEW_PROVIDER=deepseek`; direct `docker compose up` also works in mock mode without a key.

Useful operations:

```bash
docker compose logs -f backend worker frontend
docker compose restart backend worker frontend
docker compose pull
docker compose up -d --build
docker compose down
```

`docker compose down` preserves named volumes. `docker compose down -v` deletes Redis/Postgres data and should only be used intentionally.

### Reverse proxy

For a public domain, terminate TLS at a reverse proxy and forward only to the frontend:

```nginx
server {
    listen 443 ssl http2;
    server_name example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Do not add a public route to backend port `8000`. If per-IP rate limiting must use the forwarded address, add only the reverse proxy's actual IP/CIDR to `DEJAVIEW_TRUSTED_PROXIES` after confirming it overwrites the header. The global daily cap works independently of client-IP attribution.

### Optional SQL JobStore

Start the Postgres profile and select SQL storage:

```dotenv
DEJAVIEW_JOBSTORE=sql
DEJAVIEW_SQL_URL=postgresql://dejaview:dejaview@postgres:5432/dejaview
```

```bash
docker compose --profile pg up -d --build
```

Change the default Postgres password before exposing any related infrastructure. Postgres is not published by the bundled Compose file.

## 4. Render Blueprint

`render.yaml` defines separate backend and frontend Docker services.

1. Create a Render Blueprint from the repository.
2. Enter `DEEPSEEK_API_KEY` in the platform secret prompt.
3. Enter an optional `DEJAVIEW_ACCESS_CODE`; it is strongly recommended for any public real-provider instance.
4. Update `DEJAVIEW_CORS_ORIGINS` and `DEJAVIEW_BACKEND` if the generated service names differ from the template.

The template uses in-memory jobs and a background thread to minimize services. A restart loses unfinished and historical jobs. Platform plans, sleep behavior and pricing can change; verify current Render terms before relying on the service.

## 5. Split frontend and backend origins

The bundled setup uses same-origin `/api`. If the browser must call a separate public API directly:

- build the frontend with `NEXT_PUBLIC_API_BASE=https://api.example.com`;
- add the exact frontend origin to `DEJAVIEW_CORS_ORIGINS`;
- secure the API with TLS, an access code and rate limits;
- never place a model key in a `NEXT_PUBLIC_*` variable.

## 6. Health and troubleshooting

Checks:

```bash
curl http://localhost:8000/api/health   # local backend development
curl http://localhost:3000             # local/Compose frontend
docker compose ps                      # container health
```

Common failures:

- **Frontend says service unavailable:** verify the backend is on `8000` locally or `DEJAVIEW_BACKEND=http://backend:8000` in Compose.
- **403 after entering the site:** refresh and enter the current `DEJAVIEW_ACCESS_CODE`; changing it invalidates saved browser codes.
- **429:** the deployment reached a per-IP or global cap. Inspect the configured limits before raising them.
- **Jobs disappear after restart:** use Redis/SQL storage instead of the in-memory Render setup.
- **SPA pages contain little evidence:** use a registered browser/Firecrawl crawler and review its security and cost implications.
- **GitHub search is limited:** provide a server-side `GITHUB_TOKEN`; never expose it to the browser.
