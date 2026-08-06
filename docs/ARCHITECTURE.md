# DejaView 底层框架 (Architecture)

本文讲**框架层**(feature 模块之下的地基)。产品设计见 [`DESIGN.md`](DESIGN.md),任务见 [`BACKLOG.md`](BACKLOG.md)。

一句话:**确定性流水线 + 依赖注入 + 处处可插拔**。每个"外部能力"(模型、抓取、repo map、搜索、存储)都是一个接口 + 一个 mock/stub 默认实现,所以整条流水线**零成本可跑**,真实实现可以**逐个替换、并行开发**。

---

## 分层

```
                    ┌───────────────────────────────────────────┐
   HTTP  ─────────▶ │ main.py (FastAPI)  ·  jobs.py (JobStore)   │  接口层
                    └───────────────────────────────────────────┘
                                      │
                    ┌───────────────────────────────────────────┐
                    │ orchestrator.Pipeline                      │  编排层
                    │  阶段计时 · 优雅降级 · 成本闸门 · 进度回调   │
                    └───────────────────────────────────────────┘
                                      │  (Services 注入)
     ┌──────────────────────────────────────────────────────────────────┐
     │ pipeline/*  site→github→fingerprint→search→verify→judge→factlayer→report │  模块层
     │            每个模块: (输入契约, svc) -> 输出契约                    │
     └──────────────────────────────────────────────────────────────────┘
                                      │
   ┌──────────────────────────────────────────────────────────────────────────┐
   │ Services (DI 容器):  llm(LLMRouter) · search · crawler · repomap · cache · │  框架层
   │                       log · meter                                          │
   │ providers/*  base+mock+claude+openai_compatible · crawler · repomap · search│
   │ config(pydantic-settings) · logging · errors · prompts · cache             │
   └──────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌───────────────────────────────────────────┐
                    │ models/schemas.py  —— 所有数据契约(地基)   │  契约层
                    └───────────────────────────────────────────┘
```

---

## 依赖注入:`Services`

`app/services.py` 把所有可插拔依赖打成一包,按配置一处构建:

```python
@dataclass
class Services:
    settings; llm: LLMRouter; search: SearchClient; crawler: Crawler
    repomap: RepoMapper; cache: Cache; log; meter: CostMeter

svc = build_services(settings)          # 按 settings 选择每个实现
facts = site_analyzer.analyze(req, svc) # 模块只从 svc 取自己要的
```

好处:模块不自己 new 依赖 → 易测(传假 svc)、易换(改 settings)、成本/日志统一。

---

## 可插拔点(全都是"接口 + 注册表 + 默认 mock/stub")

| 能力 | 接口 | 默认 | 真实实现(注册即用) | 任务 |
|---|---|---|---|---|
| LLM | `providers/base.LLMProvider` | `deepseek` | `claude` · `qwen`(OpenAI 兼容) · `mock`; **DeepSeek v4 已验证** | E9 |
| 搜索 | `providers/search_client.SearchClient` | `composite` | **`github`·`v2ex`·`juejin` 已实现** · `mock` · `tavily`(stub) | E4 |
| 抓取 | `providers/crawler.Crawler` | **`builtin` · `browser`(JS 渲染) 已实现** | `firecrawl`(需 key) | E1 |
| repo map | `providers/repomap.RepoMapper` | **`builtin`(已实现)** | `aider` · `gitingest`(stub) | E2 |
| 任务存储 | `jobs.JobStore` | `InMemory` | **`Redis` · `SQL`(SQLite/Postgres) 已实现** + RQ 队列 | E10 |
| 缓存 | `cache.Cache` | 磁盘 JSON(可关) | Redis 等 | E9-3 |

每个都有一个 `make_xxx(settings)` 注册表函数,未知值抛 `ConfigError`。

### 加一个新实现的套路(以 LLM provider 为例)
1. 在 `providers/` 写一个类,继承 `LLMProvider`,实现 `structured_json(...)`。
2. 在 `llm_router.make_provider()` 注册一个分支。
3. `DEJAVIEW_PROVIDER=<name>` 即用。**其余模块零改动。**

搜索/抓取/repo map 同理(继承对应 ABC,在 `make_xxx` 的 `_REGISTRY` 里加一行)。

---

## 模型分层

`ModelTier.CHEAP / STANDARD / STRONG` → 默认 `Haiku / Sonnet / Opus`,全部可用 `DEJAVIEW_MODEL_*` 覆盖。
便宜步骤(提取)走 CHEAP,判断/验证走 STANDARD,裁判走 STRONG + 自适应思考(Haiku 不支持思考时自动降级)。

---

## 错误处理与优雅降级

- 异常分层:`errors.py` 的 `ProviderError / SearchError / CrawlError / RepoError / StageError / ConfigError`。
- 远程 provider 调用带**指数退避重试**(`providers/base.with_retry`)。
- 编排层 `Pipeline._stage(...)`:
  - **非关键阶段**(网站/仓库分析)失败 → 用 `empty()` 兜底,记 `job.degradations`,**流水线继续**并降低置信度。
  - **关键阶段**(指纹/搜索/裁判/渲染)失败 → 抛 `StageError`,`job.status=error` 且记录。
- 测试 `test_graceful_degradation_on_crawler_failure` 守护这条路径。

---

## 可观测性 / 成本

`CostMeter`(在 `Job.cost`):`llm_calls / input_tokens / output_tokens / search_queries / seconds / stage_seconds{每阶段耗时}`。
`LLMRouter` 与 `Services` 共享同一个 meter,渲染两种语气也只累加不重复调查。`content_hash`(请求指纹)为去重/版本重检留了种子。

---

## 配置 / 日志 / 提示词

- **配置**:`config.py` 用 `pydantic-settings`,前缀 `DEJAVIEW_`,支持 `.env`(见 `backend/.env.example`)。
- **日志**:`logging.py` 的 `get_logger("pipeline.xxx")`,`DEJAVIEW_LOG_LEVEL` 调级别。
- **提示词**:`prompts.py` 集中所有 system prompt 与 prompt 构造 —— prompt 工程只改这一个文件。

---

## 成本闸门(确定性流水线的关键控制点)

`AnalysisRequest.confirm_fingerprint=true` 时,`Pipeline.run` 在**生成指纹后暂停**(`status=await_confirm`,把指纹放进 `job.pending_fingerprint`),等前端 `POST /confirm` 传回(可编辑的)指纹,`Pipeline.resume` 再从 search 继续 —— 把最贵的搜索/裁判挡在用户确认之后。

---

## 为什么不是"一堆自治 Agent"

固定流水线的每一步输入输出都固定 → 可缓存、可测、可复现、token 可控。多 Agent 首版成本高、错误互相传递、结果不可复现。详见 [`DESIGN.md` §3](DESIGN.md)。
