# DejaView Backend

Python(FastAPI)确定性流水线 + 依赖注入 + 处处可插拔。默认 `mock` provider —— 无需任何 key 就能端到端跑通。

底层框架细节见 [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md)。

## 跑起来

```bash
python3 -m venv .venv
./.venv/bin/pip install -r requirements.txt

./.venv/bin/python scripts/run_pipeline.py       # 端到端 (mock, 打印认真版+毒舌版+成本/观测)
./.venv/bin/python -m pytest                      # 14 个测试 (流水线 8 + 框架 6)
./.venv/bin/uvicorn app.main:app --reload         # API → http://localhost:8000/docs
```

## 切 provider(claude / deepseek / qwen)

```bash
cp .env.example .env    # 编辑
export DEJAVIEW_PROVIDER=claude   ANTHROPIC_API_KEY=sk-ant-...
# 或 deepseek: DEJAVIEW_PROVIDER=deepseek DEEPSEEK_API_KEY=... 并把 DEJAVIEW_MODEL_* 设成 deepseek-chat 等
```

配置全走 `DEJAVIEW_` 前缀环境变量(pydantic-settings),见 `.env.example`。

## 目录

```
app/
├── models/schemas.py     数据契约(所有模块的地基, 改它要通知所有人)
├── config.py             pydantic-settings 配置
├── logging.py  errors.py 日志 / 异常
├── prompts.py            集中所有 system prompt 与 prompt 构造(prompt 工程只改这里)
├── services.py           ★ 依赖注入容器 Services + build_services
├── cache.py              内容 hash 缓存(可插拔/可关)
├── jobs.py               JobStore 抽象 + InMemory 实现
├── providers/
│   ├── base.py           LLMProvider 接口 + 重试
│   ├── mock_provider.py  claude_provider.py  openai_compatible.py(deepseek/qwen)
│   ├── llm_router.py     ModelTier + LLMRouter + provider 注册表
│   ├── crawler.py        Crawler 接口 + stub/firecrawl/crawl4ai
│   ├── repomap.py        RepoMapper 接口 + stub/gitingest/aider
│   └── search_client.py  SearchClient 接口 + mock/tavily/github
├── pipeline/             7 模块 + orchestrator(编排+降级+计时+成本闸门)
└── fixtures/mocks.py     mock 数据(零成本跑通)
```

## API 契约

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/analyze` | body=`AnalysisRequest` → `{job_id}`;后台线程跑流水线 |
| GET | `/api/jobs/{id}` | 轮询进度/结果(含 `reports.serious`/`reports.roast`、`cost`、`degradations`) |
| POST | `/api/jobs/{id}/confirm` | 成本闸门:提交(修正后的)`ProjectFingerprint`,从 search 继续 |
| GET | `/api/jobs/{id}/report?tone=` | 便捷取单个语气报告 |
| GET | `/api/health` | `{ok, provider}` |

## 模块契约(输入 → 输出;都收 `svc: Services`)

| 模块 | `analyze/…(输入, svc)` → 输出 | 模型层级 |
|---|---|---|
| `site_analyzer` | `AnalysisRequest` → `SiteFacts` | cheap(+ `svc.crawler`) |
| `github_analyzer` | `AnalysisRequest` → `RepoFacts` | cheap(+ `svc.repomap`) |
| `fingerprint` | `SiteFacts+RepoFacts+作者声明` → `ProjectFingerprint` | standard |
| `search` | `ProjectFingerprint` → `list[CandidateRef]` | cheap(+ `svc.search`) |
| `verify` | `候选+指纹` → `list[VerifiedCandidate]` | standard |
| `judge` | `指纹+已验证竞品` → `DuplicationVerdict` | strong + thinking |
| `factlayer` | `指纹+竞品+裁判` → `AnalysisResult` | standard |
| `report` | `AnalysisResult+语气` → `Report` | standard |

## 扩展套路(其余模块零改动)

- **加 LLM provider**:`providers/` 写 `LLMProvider` 子类 → `llm_router.make_provider()` 注册 → `DEJAVIEW_PROVIDER=<name>`。
- **加抓取 / repo map / 搜索**:继承 `Crawler` / `RepoMapper` / `SearchClient`,在对应 `make_xxx` 的 `_REGISTRY` 加一行。
- **换任务存储**:实现 `jobs.JobStore`(Redis/SQL),替换 `store` 单例。

`app/prompts.py` 里的 SYSTEM/prompt 与 `providers/*` 的 stub 就是**留给对应负责人填的坑**;接口已固定,可并行开发。详见 `docs/BACKLOG.md`。
