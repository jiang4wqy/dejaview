# DejaView 任务 Backlog（分工用）

脚手架已经把 **数据契约（`schemas.py`）** 和 **模块接口** 固定下来了，所以下面的 epic
**可以并行认领**：只要你的输入/输出符合契约，别人不用等你。

**图例**：`★MVP` = 首版必须；`⏳后续` = 首版可缓；`[并行]` = 与其他 epic 无依赖，可同时开工。
每条任务给了 **依赖** 和 **DoD（完成定义）**。认领时把 `[ ]` 改成你名字。

> 建议先集体跑一遍 [`DESIGN.md` §9 调研验收](DESIGN.md#9-开发前的调研验收写代码前先人工辅助跑-20-30-个真实项目)：
> 人工辅助跑 20–30 个真实项目，指标过关再大规模写代码。

---

## E0 · 基础设施 & 协作 [并行]
- [x] **E0-1** 脚手架：7 模块流水线 + 编排 + mock + 8 测试（已完成）
- [ ] **E0-2** ★ CI：GitHub Actions 跑 `pytest` + `ruff`/`mypy` — DoD：PR 自动跑绿
- [ ] **E0-3** ★ 前后端本地一键起（`docker-compose` 或 `Makefile`）— DoD：一条命令起 API+前端
- [ ] **E0-4** ⏳ 部署：后端容器化 + 前端 Vercel/自托管 — DoD：有可访问的预览环境
- [ ] **E0-5** 约定：`schemas.py` 变更需在 PR 描述里 @所有模块负责人

## E1 · 网站分析器 `site_analyzer` ★ [并行]
依赖：`SiteFacts` 契约（已定）
- [ ] **E1-1** ★ 接一个主抓取器（Firecrawl 或 Crawl4AI），实现 `_crawl()`：首页/功能/价格/文档/关于 + sitemap → 干净 markdown — DoD：真实 URL 能拿到结构化 markdown
- [ ] **E1-2** ★ 把 `extract_site` 的 SYSTEM/prompt 打磨到"区分营销文案 vs 实际功能" — DoD：10 个真实站点抽取准确率人工评 ≥80%
- [ ] **E1-3** `requires_login` 检测：命中时降置信度并提示补充演示视频/截图/测试账号
- [ ] **E1-4** ⏳ 客观指标：Lighthouse / Core Web Vitals 注入 `objective_metrics`
- [ ] **E1-5** ⏳ 首页/核心流程截图（存路径到 `screenshots`）

## E2 · GitHub 分析器 `github_analyzer` ★ [并行]
依赖：`RepoFacts` 契约（已定）
- [ ] **E2-1** ★ 实现 `_build_repo_map()`：借鉴 **Aider Repo Map**（提取关键类/函数/调用，图排序控 token）；或先用 GitIngest/Repomix 兜底 — DoD：中型仓库 repo map ≤ 2K token 且覆盖关键模块
- [ ] **E2-2** ★ 定向读取：按疑问只读 3–6 个关键文件（入口/API/数据模型）— DoD：总上下文可控在预算内
- [ ] **E2-3** ★ 活跃度：stars/forks/最近提交/release（GitHub API，公开仓库免 OAuth）
- [ ] **E2-4** 许可与合规：读取 license；OAuth 权限范围评估（见 `TODO.md`）

## E3 · 指纹合成器 `fingerprint` ★
依赖：E1、E2 的产物（可先用 mock 事实开工）
- [ ] **E3-1** ★ prompt 工程：交叉验证"声称 × 页面 × 代码"，产出 `functional_signature`
- [ ] **E3-2** ★ 冲突检测：把"宣称 vs 证据"不一致写进 `conflicts`；证据不足降 `confidence`
- [ ] **E3-3** ★ 与前端"指纹确认"联动（配合 E8-3）：用户可编辑后回传
- [ ] **E3-4** 稳定性：同项目多次运行指纹差异小（配合 E11 评测）

## E4 · 相似项目搜索 `search` + SearchClient ★ [并行]
依赖：`ProjectFingerprint` 契约、`SearchClient` 接口（已定）
- [ ] **E4-1** ★ query 生成打磨：同用户+同任务 / 同输入输出不同实现 / 同机制不同人群，中英文+同义词
- [ ] **E4-2** ★ 接真实搜索：先接 1 个（Tavily 或 Firecrawl search 或 Bing）实现 `SearchClient` — DoD：真实召回 20–30 候选
- [x] **E4-3** ★ GitHub 搜索源（repos, 按 star）—— 已实现: `DEJAVIEW_SEARCH_PROVIDER=github`（免 key, 可选 GITHUB_TOKEN 提额）
- [ ] **E4-4** Product Hunt / AlternativeTo / G2 源
- [ ] **E4-5** 中文社区源（V2EX「分享创造」/ 少数派 / 掘金）
- [ ] **E4-6** 召回去重与初排（浅读 20–30，交给 verify 深读前 3–5）

## E5 · 候选验证 `verify` ★
依赖：`VerifiedCandidate` 契约、E4 候选
- [ ] **E5-1** ★ 对候选套同一套指纹结构再比较（不只比营销文案）
- [ ] **E5-2** ★ 关系分类：直接竞品/替代/相邻/已停维护/表面类似，带证据
- [ ] **E5-3** 候选轻量抓取（复用 E1 抓取器）

## E6 · 重复度裁判 `judge` ★
依赖：`DuplicationVerdict` 契约、E5 产物
- [ ] **E6-1** ★ 6 维度打分 + 汇总 `duplication_score` + 置信度 + 证据
- [ ] **E6-2** ★ 创新拆解：新机制/新组合/新人群/更好执行/尚未证明
- [ ] **E6-3** ★ 强制 `search_scope_note`（只说"本次检索范围内"，禁止"没有竞品"）
- [ ] **E6-4** 评分稳定性回归（配合 E11）

## E7 · 事实层 + 报告 `factlayer` / `report` ★
依赖：`AnalysisResult`/`Report` 契约
- [ ] **E7-1** ★ 事实层：优点/问题/改进（改进按 impact×cost 排序），每条带证据
- [ ] **E7-2** ★ 认真版 prompt：优势/问题/竞品借鉴/改进优先级
- [ ] **E7-3** ★ 毒舌版 prompt：犀利但每句对应事实、不攻击开发者本人（不变量已在代码里守住）
- [ ] **E7-4** ⏳ 分享图（GitBox 风格），填 `share_card_ref`

## E8 · 前端 ★ [并行]
依赖：后端 API 契约（已定，见 `backend/README.md`）；脚手架已由 agent 生成
- [ ] **E8-1** ★ 提交流：网址 + GitHub + 作者三问 + 语气 + 确认闸门开关
- [ ] **E8-2** ★ 进度页：轮询 `stage`/`progress`，阶段中文化
- [ ] **E8-3** ★ 指纹确认卡：`await_confirm` 时可编辑并回传 `/confirm`
- [ ] **E8-4** ★ 报告页：认真/毒舌**客户端一键切换**（两份已在 `reports` 里，不重新请求）
- [ ] **E8-5** ★ 每条 finding "点开证据"（展开 `evidence[]`）
- [ ] **E8-6** ★ 重复度徽章 + 检索边界声明 + 竞品列表 + 改进(带 impact/cost)
- [ ] **E8-7** ⏳ 分享卡下载、报告默认私密/可分享链接

## E9 · Provider / 成本层 [并行]
依赖：`LLMProvider` 接口（已定）
- [ ] **E9-1** ⏳ `DeepSeekProvider` / `QwenProvider`（`make_provider` 注册即可，其余零改动）
- [ ] **E9-2** ★ 真实 token/成本核算（从各 provider 的 usage 累加到 `CostMeter`）
- [ ] **E9-3** 缓存落地：`cache.py` 接进 analyzers（按内容 hash 命中）
- [ ] **E9-4** 重试/降级：某源失败时优雅降级并在报告里标注

## E10 · 存储 / 任务 [并行]
- [ ] **E10-1** ★ `Job` 持久化（内存 → Redis/Postgres）
- [ ] **E10-2** ★ 真正的任务队列（替换后台线程）
- [ ] **E10-3** ⏳ 用户账户 + 项目版本记录（改版后重新检测哪些问题真正改善）
- [ ] **E10-4** ⏳ 允许作者纠正指纹并沉淀成高质量项目分析数据集

## E11 · 评测 / 验收 ★ [并行]
- [ ] **E11-1** ★ 收集 20–30 个真实项目（明显重复 / 明显创新 / 难判断 三类）
- [ ] **E11-2** ★ 跑通 `DESIGN.md §9` 的 7 项验收指标，出报告
- [ ] **E11-3** 重复度评分稳定性、指纹一致性回归脚本

---

## 并行开工建议（第一周）

契约已固定，下列可**同时**动手，互不阻塞（都能用 mock 事实/候选先跑）：
`E1 抓取` · `E2 repo map` · `E4 真实搜索` · `E8 前端联调` · `E9 国内模型` · `E11 评测集`。

关键路径：`E1/E2 → E3 指纹 → E4/E5/E6 → E7 报告`。先各自替换 mock，再串真实链路。
