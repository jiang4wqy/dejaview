<div align="center">

<img src="docs/assets/hero.jpg" alt="DejaView — 一个项目，三种审判：认真·镀金 / 毒舌·马戏团 / 安慰·彩虹" width="840">

<img src="docs/assets/logo.png" alt="DejaView logo" width="76">

# DejaView · 项目照妖镜

### 在你 all in 之前，先照照这轮子有没有人造过。

*证据化的项目鉴定 —— 刻薄可以主观，事实不能主观；锐评项目，不攻击开发者本人。*

<sub>DejaView = déjà vu + view · "我是不是见过这个？"</sub>

</div>

---

AI 让人人都能造东西了。于是——
**从前是十个人合力做一个有用的工具，现在是一个人一晚上做十个没用的。**

<div align="center"><img src="docs/assets/flood.jpg" alt="AI 时代：一个人一晚上造十个没用的 App" width="90%"></div>

你有没有过这种时刻：熬了三个通宵做完一个项目，兴冲冲发到群里，第一条回复是——

> **「这不就是 XXX 吗？」**

那一瞬间的尴尬，**DejaView 想帮你提前避免**。

## 它会做什么

把你的项目丢进来（一个网址 / 一个 GitHub 仓库 / 甚至只是一句话想法），它像一面照妖镜，照出你项目在全网的"同类倒影"：

<div align="center"><img src="docs/assets/mirror.jpg" alt="照妖镜：照出你项目的同类与它们的评分" width="620"></div>

1. 🔍 **提取核心** —— 一句话说清你到底在做什么；
2. 🌐 **全网找同类** —— 有没有人已经做过一模一样的事；
3. ⚖️ **判重复度** —— 你是不是在重复造轮子：别人做到哪了、功能是不是更全、你还有没有位置；
4. 💡 **给改进意见** —— 你真正的创新点在哪、有什么能偷师优化的地方。

**每一条结论都能点开看证据。**

## 同一份事实，三副面孔，一键切换

| 💰 认真·镀金 | 🤡 毒舌·马戏团 | 🌈 安慰·彩虹 |
|:--:|:--:|:--:|
| 华尔街评级委员会的口吻，给你的项目做一次冷静「尽调」 | 脱口秀吐槽现场，往死里刻薄——但只踩事实、不踩你 | 无条件夸夸群，需要情绪价值时来一发 |
| <img src="docs/assets/world-serious.png" alt="认真·镀金" width="260"> | <img src="docs/assets/world-roast.png" alt="毒舌·马戏团" width="260"> | <img src="docs/assets/world-comfort.png" alt="安慰·彩虹" width="260"> |

> 三套皮肤共享**同一个事实层**：换脸不换事实。想被夸就夸，想挨骂就骂，结论永远站在证据上。

---

## 为什么做这个

竞品调研结论（见 [`docs/DESIGN.md`](docs/DESIGN.md)）：
「输入网址 → AI 毒舌点评」已经非常拥挤、门槛极低（GitHub 上 ~69 个同类仓库）。
真正没人做通的、也是我们要占的位置，是这条完整链路：

**网站 + GitHub 双源理解 → 可核验的竞品搜索 → 创新点校准 → 证据化改进 → 认真/毒舌/安慰同源切换。**

## 核心设计（已锁定）

1. **先形成统一、可追溯的事实判断，最后才切换语气。** 三种语气（认真/毒舌/安慰）共享同一事实层，
   换皮不换事实——任何语气都不新增未经证实的说法（此不变量在 `report.py` 里用代码强制，并有测试守护）。
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
└── frontend/                  ← Next.js(提交→进度→报告, 认真/毒舌/安慰三世界换肤, 点开证据)
```

## 快速开始

一键（需 `python3` + `node`）：

```bash
make install     # 装前后端依赖(venv + npm)
make dev         # 同时起后端(:8000) + 前端(:3000)
make test        # 后端测试(20 个)
make eval        # 评测 harness(默认 mock; 配 .env 后跑真实校准)
```

**一键部署**（自建服务器 / VPS，装好 Docker 即可）——只需两步：

```bash
git clone https://github.com/jiang4wqy/dejaview.git && cd dejaview
./deploy.sh        # 首次自动生成 .env → 填入 DEEPSEEK_API_KEY → 再跑一次即启动
```

起来后浏览器打开 `http://<你的服务器IP>:3000` 即可用。**单端口**：只需对外开放 `3000`，浏览器走同源 `/api` 由前端反代到后端，无需配置公网地址、后端端口也不必暴露。整套是 redis + 后端 API + rq worker + 前端（`docker compose`）；Job 用 Redis 持久化、搜索多源合并(github+v2ex)。

> ⚠️ **成本提醒**：分析用的是**你自己的 DeepSeek key、走你的额度**。若部署成公开站点，任何访客的每次分析都消耗你的余额——上线前建议加**限流 / 每日额度上限**，或改成**让用户各自填自己的 key**（见下方「公开上线前」）。

**离线零成本**（默认，无需任何 key）：直接 `make dev`，前端提交后走 mock，秒出三语气报告。前端首页还内置**预生成示例**（`frontend/public/demos/*.json`），点一下秒开、无需等待。

**真实模式**（推荐）：`cp backend/.env.example backend/.env`，填 DeepSeek key（或 Claude/Qwen）。即用**真实 DeepSeek + 内置抓取 + git clone + GitHub 搜索**分析真实项目。命令行跑一次：

```bash
cd backend && ./.venv/bin/python scripts/run_pipeline.py \
  --website https://gitingest.com --github https://github.com/cyclotruc/gitingest
```

## 公开上线前（成本与安全）

分析每次会调用 LLM，**默认走部署者自己配置的 DeepSeek key 与额度**。放到公网「供大家用」前，先想清楚谁来买单：

| 模式 | 谁付费 | 适合 | 要做的防护 |
|:--|:--|:--|:--|
| **A. 你请客**（默认） | 你的 DeepSeek 余额 | 小范围 / 演示 / 朋友试用 | **必须**加限流 + 每日总额度上限，否则会被刷爆 |
| **B. 用户自带 key（BYO）** | 每个用户自己 | 真正公开、放心让陌生人用 | 前端加一个「填你的 key」输入框，只在本次请求用、不落库 |
| **C. 仅演示** | 你 | 只想展示效果 | 关掉真实分析、只放「秒开示例」(`public/demos/*.json`) |

- **密钥安全**：key 只存在服务端（`backend/.env` / 部署 `.env`，均已 gitignore），**绝不进前端、不进仓库**。本仓库历史已核验无任何真实 key。
- 想上 A：加个 IP/时间窗限流（如每 IP 每小时 N 次）+ 成本闸门；想上 B：加 key 输入框 + 后端按请求透传。两种我都能接着实现。

## 现状

- ✅ **基本可运行**：真实模式端到端跑通 —— 真实 DeepSeek(v4) + 内置网站抓取 + `git clone` 仓库理解 + 真实 GitHub 搜索，对真实项目产出证据化的三语气报告；前端 `npm run build` 通过、API 契约端到端验证。
- ✅ **体验迭代**：① 三世界换肤——认真·镀金（华尔街评级委员会）/ 毒舌·马戏团 / 安慰·彩虹（无条件夸夸），每套独立字体+特效，事实层共享；② 赛道信号——由竞品 star/活跃度确定性推「该不该做」；③ 极简灵活输入——单线索框自动识别 网址/仓库/纯想法（idea-only 也能测，缺口显式降置信）；④ 一键生成分享战报海报。
- ✅ 底层框架完善：依赖注入容器（Services）、LLM/抓取/repomap/搜索/存储全部可插拔、错误优雅降级、成本/阶段观测、pydantic-settings 配置、集中提示词；20 测试通过。
- ⏳ 后续（见 [`docs/BACKLOG.md`](docs/BACKLOG.md)）：生产部署、Job 持久化、更多搜索源（中文社区）、Firecrawl/Aider 增强、评测集。
