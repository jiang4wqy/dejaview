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
│   ├── BACKLOG.md             ← 可拆分任务清单(团队认领用) ★
│   └── TODO.md                ← 明确暂缓项 / 已知限制 / 合规边界 / 当前 stub 清单
├── backend/                   ← Python(FastAPI) 确定性流水线  ← 已可运行(mock)
│   ├── app/
│   │   ├── models/schemas.py  ← 数据契约(所有模块的地基) ★
│   │   ├── providers/         ← llm_router(可插拔,默认 Claude 分层) / search_client
│   │   ├── pipeline/          ← 7 个模块 + orchestrator
│   │   ├── fixtures/mocks.py  ← mock 数据(零成本跑通)
│   │   └── main.py            ← FastAPI 端点
│   ├── scripts/run_pipeline.py← CLI:端到端跑通
│   └── tests/                 ← pytest(含"毒舌不新增结论"不变量测试)
└── frontend/                  ← Next.js(提交→进度→报告, 认真/毒舌切换, 点开证据)
```

## 快速开始

**后端（零成本、无需任何 key）：**

```bash
cd backend
python3 -m venv .venv && ./.venv/bin/pip install -r requirements.txt
./.venv/bin/python scripts/run_pipeline.py      # 端到端跑通并打印认真版+毒舌版
./.venv/bin/python -m pytest                     # 8 个测试
./.venv/bin/uvicorn app.main:app --reload        # 起 API: http://localhost:8000/docs
```

切到真实 Claude：`export DEJAVIEW_PROVIDER=claude` 并配置 `ANTHROPIC_API_KEY`。
分层默认 Haiku(提取)/Sonnet(判断)/Opus(裁判)，均可用环境变量覆盖，见 `backend/.env.example`。

**前端：**

```bash
cd frontend && npm install && npm run dev       # http://localhost:3000
```

## 现状

- ✅ 后端框架可运行：7 模块流水线 + 编排 + 成本闸门 + 成本计量，mock 端到端跑通，8 测试通过。
- ✅ provider / search 均为可插拔接口，默认 Claude 分层 + mock。
- ⏳ 真实能力（抓取 / repo map / 真实搜索 / 国内模型 / 前端联调 / 持久化）是**留给团队认领**的部分，
  已在 [`docs/BACKLOG.md`](docs/BACKLOG.md) 按模块拆好，接口已固定，可并行开发。
