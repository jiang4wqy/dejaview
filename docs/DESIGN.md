# DejaView 设计文档

> 本文把前期战略讨论落成可执行的设计。战略结论（竞品格局、切入方案 A/B/C）见文末附录。

---

## 1. 定位与原则

**定位：证据化的项目鉴定。** 认真分析是核心产品，锐评只是"报告皮肤"。

**四条产品原则（写进代码与流程，不只是口号）：**

1. **事实层统一，语气层分叉。** 先形成统一、可追溯的事实判断，最后才切换语气。
   毒舌版和认真版**共享同一事实层**，毒舌版不新增任何未经证实的攻击。
   → 在 `pipeline/report.py` 用代码强制（`report.findings = 事实层 findings`），并有测试 `test_roast_adds_no_unverified_findings` 守护。
2. **每条结论都带证据。** 所有 `Finding / Improvement / Differentiator / 裁判维度` 都挂 `Evidence`（来源类型 + 定位符 + 简短原文 + 置信度），UI 可点开。
3. **缺信息就显式降低置信度。** 不假装"全面理解"。需要登录 / 无 GitHub / 抓取不到，都要 `missing_info` + 降 `confidence`，而不是编。
4. **锐评项目，不攻击开发者本人。** 刻薄可以主观，事实不能主观。

---

## 2. 锁定的产品流程

```
用户提交 (网站 URL + 可选 GitHub + 作者三问 + 预选语气)
        │
        ├── site_analyzer   ──▶ SiteFacts        (抓取 = 零 token 结构化提取)
        ├── github_analyzer ──▶ RepoFacts        (低 token repo map + 定向读文件)
        │
        └── fingerprint     ──▶ ProjectFingerprint
                │   ★ 成本控制关口: 可先把这张卡给用户确认/修正, 再启动昂贵的搜索
                ├── search  ──▶ list[CandidateRef]      (只召回, 不下结论)
                ├── verify  ──▶ list[VerifiedCandidate] (对候选套同一套指纹结构再比)
                ├── judge   ──▶ DuplicationVerdict       (重复度裁判: 概率+维度+证据)
                └── factlayer ──▶ AnalysisResult         (统一事实层)
                        │
                        └── report ──▶ 认真版 Report / 毒舌版 Report
```

**作者三问**（提交时填，用于校准，显著减少理解跑偏和无效搜索）：
① 给谁用？ ② 解决什么具体问题？ ③ 你认为最不同的地方是什么？

AI 不替作者猜创新点，而是比较：**作者声称 × 页面呈现 × 代码/文档证据 × 竞品已有能力**。

---

## 3. 为什么是"确定性流水线 + 少量专用模型调用"

三种技术组织方式里我们选第三种：

| 方式 | 评价 |
|---|---|
| 单个 Agent 从头到尾 | 开发最快，但易跑偏、token 高、结果不可复现 |
| 多 Agent 分角色 | 看起来专业，但首版成本高，错误互相传递 |
| **固定流水线 + 少量专用模型调用** ✅ | 每模块固定输入输出，易缓存/测试/替换，最适合控制 token |

对应实现：`pipeline/*.py` 每个模块是纯函数式的一步，`orchestrator.py` 确定性地串起来。
模型调用集中在 `providers/llm_router.py`（**provider 无关**，可切 Claude / DeepSeek / Qwen / mock）。

---

## 4. 分层模型策略

| 层级 | 默认模型 | 用在哪 |
|---|---|---|
| CHEAP | `claude-haiku-4-5` | 网站/仓库事实提取（结构化，量大） |
| STANDARD | `claude-sonnet-5` | 指纹合成、候选验证、事实层、报告渲染 |
| STRONG | `claude-opus-4-8` + 自适应思考 | 重复度裁判（最需要判断力的一步） |

架构 provider 无关，这里只是默认值；全部可用环境变量覆盖。国内模型接入见 `TODO.md`。

---

## 5. 成本控制关口（token 就是钱）

1. **指纹确认闸门**：`confirm_fingerprint=true` 时，生成指纹后暂停等用户确认，
   用户纠正后再启动昂贵的搜索/验证/裁判 —— 这是整个产品最重要的成本关口。
2. **抓取/提取分离**：抓取是零 token 的结构化提取，只有必要内容才喂模型。
3. **低 token 仓库理解**：repo map（~1-2K）+ README/配置（~3-5K）+ 按疑问定向读 3-6 个文件，
   **不**默认把整个仓库塞给模型。
4. **内容 hash 缓存**：同一网站/仓库重复分析命中缓存（`cache.py`，接口已留）。
5. **成本可观测**：`CostMeter` 记录每个报告的 LLM 调用数 / token / 搜索次数 / 耗时。

---

## 6. 现有项目的能力分工（借鉴，不照搬）

| 模块 | 主要参考 | 借鉴内容 | 不直接照搬 |
|---|---|---|---|
| GitHub 接入 | GitBox (MIT) | GitHub 分析、锐评、图片报告、自部署 | 首版不必要求 OAuth，公开仓库直接读 |
| 市场调研流程 | IdeaScan | 关键词扩展、多平台搜索、竞品分析、可追踪报告、失败降级 | 多 Agent/热点雷达对首版过重；复用代码前核对许可 |
| 结构化研究数据 | Business Idea Validator (MIT) | 痛点/兴奋信号/竞品/风险/相关度评分的数据模型 | 不照搬其抓取实现 |
| 国内需求证据 | 小红书验证器 | 从社媒提取真实痛点 | 抓取稳定性/平台规则风险高，**首版暂缓** |
| 网站理解 | WTF Does This Company Do | 定向读首页/功能/价格/关于/文档；锐评引用真实事实 | 不用无限制多轮自治搜索；许可未明，先只借方法 |
| 低 token 仓库理解 | Aider Repo Map | 提取关键类/函数/调用关系，图排序后控 token 预算 | 不把整个仓库塞给模型 |
| 网页抓取 | Firecrawl / Crawl4AI | 网页转 markdown、sitemap、结构化内容 | 首版只选一个主抓取器 |
| 报告包装 | GitBox / Atoms / Manus | 分享卡片、进度展示、证据引用、功能对比表 | 不做与核心判断无关的创业计划书 |

---

## 7. 数据契约（模块地基）

全部在 `backend/app/models/schemas.py`。核心类型：

- 输入：`AnalysisRequest`（`website_url?`, `github_url?`, `AuthorStatement`, `tone`, `confirm_fingerprint`）
- 事实：`SiteFacts`、`RepoFacts`
- 指纹：`ProjectFingerprint`（含 `functional_signature` 驱动搜索；`conflicts`/`unknowns`；`user_confirmed`）
- 搜索/验证/裁判：`CandidateRef` → `VerifiedCandidate` → `DuplicationVerdict`（`duplication_score` + 6 维度 + `novelty` 拆解 + `search_scope_note`）
- 事实层：`AnalysisResult`（`strengths`/`issues`/`improvements`，都带 `Evidence`）
- 报告：`Report`（`tone`, `headline`, `body_markdown`, `findings` 带证据）
- 任务：`Job`（`status`/`stage`/`progress`/`cost`/`reports`）

通用块：`Evidence`、`Finding`、`Improvement`、`Confidence`、`Stage`、`CostMeter`。

---

## 8. MVP 边界

**第一版做：**
公开网站 URL + 可选公开 GitHub + 作者三问 → 快速项目指纹（可确认）→ 3-5 个相似产品及证据 →
功能对比/重复度判断 → 3 条按影响/成本排序的改进 → 认真/毒舌一键切换 → 报告默认私密。

**第一版不做：**
上传 ZIP/私有代码、登录后应用自动探索、公开社区/排行榜、自动市场规模/收入/成功率预测、
"你的项目没有任何竞品"这类无法证明的结论。

**切入方案（已定）：** 用 **A（证据化项目鉴定）** 做产品主体，借 **B（病毒式锐评）** 做获客，
暂不做 **C（AI + 真人社区）**（冷启动/审核/侵权/治理都重）。

---

## 9. 开发前的调研验收（写代码前先人工辅助跑 20-30 个真实项目）

覆盖"明显重复 / 明显创新 / 难以判断"三类，至少验证：

- [ ] 项目核心指纹大部分**无需**作者纠正
- [ ] Top 5 相似项目大部分**真正相关**（≥2-3 个公认相关）
- [ ] 每个事实结论都能追溯到网页或代码
- [ ] 同一项目重复运行，重复度评分**稳定**
- [ ] 无 GitHub / 内容不足 / 需登录时，系统能**诚实降低置信度**
- [ ] 单报告的搜索次数、token、耗时、API 成本可接受
- [ ] GitHub 许可、OAuth 权限、抓取规则、数据保存边界已澄清

用户能从报告中选出**至少一条愿意实施**的改进 = 成功。

---

## 附录：竞品格局（截至 2026-08-05 检索）

| 类别 | 代表 | 留给我们的空间 |
|---|---|---|
| AI 网站锐评 | Roast My Web | 偏网页质量，不判断项目创新性 |
| AI 项目锐评 | BigDevSoon Roast My Project | 有评分/社区，但竞品研究弱 |
| 真人锐评社区 | RoastMyWork | 有社区壁垒，但反馈速度/质量不稳 |
| 想法验证 | IdeaProof / ValidatorAI | 侧重"想法"，不理解已做出的产品 |
| 数据型验证 | Preuve | 偏商业验证，缺网站/代码层分析 |
| 最接近的开源 | WTF Does This Company Do | 已很接近，但不分析 GitHub/创新证据/版本 |
| 中文锐评 | GitBox (~460★) | 偏"你在 GitHub 写了啥"，无市场/重复/创新分析 |
| 中文认真验证 | IdeaScan / 小红书验证器 | 侧重需求验证，非"上线产品"的双源鉴定 |

**没有一个中文产品把这条链做通**：网站 + GitHub → 提取核心 → 搜索相似 → 判断重复 → 证据化改进 → 认真/毒舌同源切换。这正是我们的位置。
