# DejaView · 项目锐评（工作代号）

> 输入一个网站（可选 GitHub 仓库）→ 准确提取项目核心 → 搜索相似项目 → 判断重复程度 →
> 给出**证据化**的改进意见 → **一键在「认真」/「毒舌」两种语气间切换**。
>
> 一句话定位：**证据化的项目鉴定**。刻薄可以主观，事实不能主观；锐评项目，不攻击开发者本人。

「DejaView」（déjà vu + view，"我是不是见过这个？"）只是工作代号，随时可改。

---

## 为什么做这个

竞品调研结论（见 [`docs/DESIGN.md`](docs/DESIGN.md)）：
「输入网址 → AI 毒舌点评」已经非常拥挤、门槛极低（GitHub 上 ~69 个同类仓库）。
真正没人做通的、也是我们要占的位置，是这条完整链路：

**网站 + GitHub 双源理解 → 可核验的竞品搜索 → 创新点校准 → 证据化改进 → 认真/毒舌同源切换。**

## 核心设计（已锁定）

1. **先形成统一、可追溯的事实判断，最后才切换语气。** 毒舌版和认真版共享同一事实层，
   毒舌版不新增任何未经证实的攻击（此不变量在 `report.py` 里用代码强制，并有测试守护）。
2. **确定性流水线 + 少量专用模型调用**（而非一堆自治 Agent）：每个模块固定输入输出，
   易缓存、易测试、易替换，最适合控制 token。
3. **每条结论都带证据**（Evidence：来源定位 + 置信度），UI 上可点开。
4. **缺信息就显式降低置信度**，不假装"全面理解"；GitHub 可选，缺失时降置信度。

## 流水线

```
提交(网址 + GitHub? + 作者三问 + 语气)
  ├─ site_analyzer   → SiteFacts
  ├─ github_analyzer → RepoFacts
  └─ fingerprint     → ProjectFingerprint   ← 成本闸门:可让用户确认/修正后再往下
        ├─ search    → 候选(只召回)
        ├─ verify    → 深读 + 关系分类
        ├─ judge     → 重复度裁判(概率 + 维度 + 证据)
        └─ factlayer → 统一事实层(优点/问题/改进)
              └─ report → 认真版 & 毒舌版(共享事实层)
```

## 目录结构

```
dejaview/
├── README.md                  ← 本文件
├── docs/
│   ├── DESIGN.md              ← 完整设计:原则/流程/模块契约/借鉴分工/MVP边界/验收
│   ├── ARCHITECTURE.md        ← 底层框架:DI 容器 / 可插拔点 / 错误降级 / 观测 ★
│   ├── BACKLOG.md             ← 可拆分任务清单(团队认领用) ★
│   └── TODO.md                ← 明确暂缓项 / 已知限制 / 合规边界 / 当前 stub 清单
├── backend/                   ← Python(FastAPI) 确定性流水线  ← 已可运行(mock)
│   ├── app/
│   │   ├── models/schemas.py  ← 数据契约(所有模块的地基) ★
│   │   ├── services.py        ← 依赖注入容器 Services ★
│   │   ├── config/logging/errors/prompts.py  ← 配置 / 日志 / 异常 / 提示词
│   │   ├── providers/         ← LLM(mock/claude/deepseek/qwen)·抓取·repomap·搜索(全可插拔)
│   │   ├── pipeline/          ← 7 个模块 + orchestrator(降级/计时/成本闸门)
│   │   ├── jobs.py  cache.py  ← JobStore 抽象 / 内容 hash 缓存
│   │   ├── fixtures/mocks.py  ← mock 数据(零成本跑通)
│   │   └── main.py            ← FastAPI 端点
│   ├── scripts/run_pipeline.py← CLI:端到端跑通
│   └── tests/                 ← pytest 20 个(不变量 + 框架 + 内置 provider)
└── frontend/                  ← Next.js(提交→进度→报告, 认真/毒舌切换, 点开证据)
```

## 快速开始

一键（需 `python3` + `node`）：

```bash
make install     # 装前后端依赖(venv + npm)
make dev         # 同时起后端(:8000) + 前端(:3000)
make test        # 后端测试(20 个)
make eval        # 评测 harness(默认 mock; 配 .env 后跑真实校准)
```

**生产部署**（docker-compose：redis + backend + frontend）：`cp deploy.env.example .env` 填 key，再 `docker compose up -d --build`。
Job 用 Redis 持久化(`DEJAVIEW_JOBSTORE=redis`)；搜索用多源合并(`DEJAVIEW_SEARCH_PROVIDER=composite`, github+v2ex)。

**离线零成本**（默认，无需任何 key）：直接 `make dev`，前端提交后走 mock，秒出认真版/毒舌版报告。

**真实模式**（推荐）：`cp backend/.env.example backend/.env`，填 DeepSeek key（或 Claude/Qwen）。即用**真实 DeepSeek + 内置抓取 + git clone + GitHub 搜索**分析真实项目。命令行跑一次：

```bash
cd backend && ./.venv/bin/python scripts/run_pipeline.py \
  --website https://gitingest.com --github https://github.com/cyclotruc/gitingest
```

## 现状

- ✅ **基本可运行**：真实模式端到端跑通 —— 真实 DeepSeek(v4) + 内置网站抓取 + `git clone` 仓库理解 + 真实 GitHub 搜索，对真实项目产出证据化的认真版/毒舌版报告；前端 `npm run build` 通过、API 契约端到端验证。
- ✅ 底层框架完善：依赖注入容器（Services）、LLM/抓取/repomap/搜索/存储全部可插拔、错误优雅降级、成本/阶段观测、pydantic-settings 配置、集中提示词；20 测试通过。
- ⏳ 后续（见 [`docs/BACKLOG.md`](docs/BACKLOG.md)）：生产部署、Job 持久化、更多搜索源（中文社区）、Firecrawl/Aider 增强、评测集。
