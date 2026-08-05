# DejaView Backend

Python(FastAPI) 确定性流水线。默认 `mock` provider —— 无需任何 API key 就能端到端跑通。

## 跑起来

```bash
python3 -m venv .venv
./.venv/bin/pip install -r requirements.txt

# 1) CLI 端到端 (mock, 打印认真版 + 毒舌版报告 + 成本)
./.venv/bin/python scripts/run_pipeline.py

# 2) 测试 (8 个, 含"毒舌版不新增未证实结论"不变量)
./.venv/bin/python -m pytest

# 3) API
./.venv/bin/uvicorn app.main:app --reload      # http://localhost:8000/docs
```

## 切到真实 Claude

```bash
cp .env.example .env      # 编辑
export DEJAVIEW_PROVIDER=claude
export ANTHROPIC_API_KEY=sk-ant-...
```

分层模型（可覆盖）：`DEJAVIEW_MODEL_CHEAP/STANDARD/STRONG` = Haiku / Sonnet / Opus。

## API 契约

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/analyze` | body=`AnalysisRequest` → `{job_id}`；后台线程跑流水线 |
| GET | `/api/jobs/{id}` | 轮询进度/拿结果（含 `reports.serious` / `reports.roast`） |
| POST | `/api/jobs/{id}/confirm` | 成本闸门：提交（修正后的）`ProjectFingerprint`，从 search 继续 |
| GET | `/api/jobs/{id}/report?tone=` | 便捷取单个语气报告 |
| GET | `/api/health` | `{ok, provider}` |

所有请求/响应模型定义在 `app/models/schemas.py`（**改它要通知所有模块负责人**）。

## 模块契约（固定输入 → 输出）

| 模块 | 文件 | 输入 → 输出 | 模型层级 |
|---|---|---|---|
| 网站分析 | `pipeline/site_analyzer.py` | `AnalysisRequest` → `SiteFacts` | cheap |
| 仓库分析 | `pipeline/github_analyzer.py` | `AnalysisRequest` → `RepoFacts` | cheap |
| 指纹合成 | `pipeline/fingerprint.py` | `SiteFacts+RepoFacts+作者声明` → `ProjectFingerprint` | standard |
| 相似搜索 | `pipeline/search.py` | `ProjectFingerprint` → `list[CandidateRef]` | cheap + SearchClient |
| 候选验证 | `pipeline/verify.py` | `候选+指纹` → `list[VerifiedCandidate]` | standard |
| 重复裁判 | `pipeline/judge.py` | `指纹+已验证竞品` → `DuplicationVerdict` | strong + thinking |
| 事实层 | `pipeline/factlayer.py` | `指纹+竞品+裁判` → `AnalysisResult` | standard |
| 报告渲染 | `pipeline/report.py` | `AnalysisResult+语气` → `Report` | standard |
| 编排 | `pipeline/orchestrator.py` | 串起全部 + 进度 + 成本闸门 + 成本计量 | — |

每个 `pipeline/*.py` 里的 `SYSTEM` 提示词和 `_crawl()/_build_repo_map()` stub 就是**留给对应负责人填的坑**；
接口和数据契约已固定，可并行开发。详见 `docs/BACKLOG.md`。

## 加一个新 provider（如 DeepSeek/Qwen）

在 `app/providers/llm_router.py` 里加一个 `LLMProvider` 子类，实现 `structured_json(...)`，
在 `make_provider()` 注册即可，**其余模块零改动**。
