# DejaView Backend

FastAPI API and deterministic analysis pipeline. The local default uses the mock LLM, stub inputs, an in-memory JobStore and a background thread, so it runs without credentials.

See [Architecture](../docs/ARCHITECTURE.md) and [Deployment](../docs/DEPLOYMENT.md) for system-level details.

## Run locally

```bash
python -m venv .venv
./.venv/bin/python -m pip install -r requirements-dev.txt
./.venv/bin/python -m uvicorn app.main:app --reload --port 8000
```

Windows PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

API docs: `http://localhost:8000/docs`.

## Test and run the CLI

```bash
./.venv/bin/python -m pytest -q
./.venv/bin/python scripts/run_pipeline.py
```

Use `--basetemp .pytest-tmp` if the system temporary directory is not writable.

## Configuration

Copy `.env.example` to `.env` only when you need real providers. Settings use the `DEJAVIEW_` prefix; provider credentials such as `DEEPSEEK_API_KEY`, `ANTHROPIC_API_KEY` and `GITHUB_TOKEN` are read server-side.

The main replaceable capabilities are:

- LLM: mock, Claude, DeepSeek and Qwen-compatible endpoints;
- crawler: stub, built-in HTTP, browser and registered integrations;
- repository mapper: stub, built-in shallow-clone mapper and registered integrations;
- search: mock, GitHub, V2EX, Juejin and composite;
- JobStore: memory, Redis or SQL;
- queue: thread or RQ.

## API

| Method | Path | Access-code behavior |
|---|---|---|
| `GET` | `/api/health` | always public |
| `POST` | `/api/access` | always public; validates `X-Access-Code` |
| `POST` | `/api/analyze` | protected when a code is configured |
| `GET` | `/api/jobs` | protected |
| `GET` | `/api/jobs/{id}` | protected |
| `POST` | `/api/jobs/{id}/confirm` | protected |
| `GET` | `/api/jobs/{id}/report` | protected |

“Protected” means open when `DEJAVIEW_ACCESS_CODE` is empty and requires the matching `X-Access-Code` header when it is set.

## Code map

```text
app/
├── main.py, security.py, ratelimit.py  HTTP and cost boundary
├── models/schemas.py                   shared contracts
├── jobs.py, queue.py                   storage and execution
├── services.py                         dependency construction
├── providers/                          external capability implementations
├── pipeline/                           fixed analysis stages and orchestrator
└── fixtures/mocks.py                   zero-cost deterministic fixtures
```

Tone-specific reports must not add facts outside the shared fact layer. Preserve that invariant when editing schemas, prompts, scoring or report rendering.
