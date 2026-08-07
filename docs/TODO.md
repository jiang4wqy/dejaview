# TODO / 明确暂缓 / 已知限制 / 合规边界

区别于 `BACKLOG.md`（可认领的正向任务），本文记录：**当前的 stub、首版明确暂缓项、已知风险、合规边界**。

## 当前 stub（脚手架里是占位，需替换成真实实现）

| 位置 | 现状 | 换成 | 对应任务 |
|---|---|---|---|
| `providers/crawler.py` | **builtin 已实现**(httpx+bs4+markdownify) | Firecrawl/Crawl4AI(JS 渲染增强) | E1 |
| `providers/repomap.py` | **builtin 已实现**(git clone --depth 1) | Aider 图排序增强 | E2 |
| `providers/search_client.py` | mock + **GitHub 已实现** | Tavily / 中文社区(stub) | E4-2 / E4-4 / E4-5 |
| `providers/*_provider.py` | mock/claude/**deepseek(v4 已验证)**/qwen | 更多国内模型 | E9 |
| `jobs.py::store`（内存） | 进程内字典 | Redis / Postgres | E10-1 |
| `main.py` 后台线程 | `threading.Thread` | 任务队列（Celery/RQ/Arq） | E10-2 |
| `cache.py` | 已实现但未接入 analyzers | 按内容 hash 命中 | E9-3 |

## 首版明确暂缓（后续补充）

- **国内需求证据（小红书等社媒）**：从小红书笔记/评论提取真实痛点来验证"是不是伪需求"。
  抓取稳定性与平台规则风险较高，**首版暂缓**，进 TODO 后续补。参考：小红书商业创意验证器。
- **GitHub OAuth**：首版只读公开仓库，不要求 OAuth（降低门槛、避开权限范围问题）。
- **登录后应用的自动探索**：动态应用需登录才能理解时，首版只诚实降置信度并请用户补充演示/截图/测试账号。
- **公开社区 / 排行榜（切入方案 C）**：冷启动、审核、恶意攻击、侵权、社区治理都重，不做首版。
- **自动市场规模 / 收入 / 成功率预测**：无法证明，不做。
- **上传 ZIP / 私有代码**：首版不支持。

## 已知限制（当前脚手架）

- mock 的 `verify_candidate` 是**静态返回**（所有候选同一关系），真实实现要逐个深读。
- `CostMeter.input/output_tokens` 在 mock 下为 0；真实 provider 需从 usage 累加（E9-2）。
- `orchestrator` 用后台线程，进程重启会丢 Job（E10）。
- 前端已 `npm install` + `npm run build` 通过；本无头环境未做真实浏览器点击验证(以 build 通过 + API 契约 curl 端到端验证兜底)。
- 内置抓取器不执行 JS（SPA 站点首页可能内容偏少）；需要时切 Firecrawl/Crawl4AI(E1 增强)。
- 在 **SOCKS 代理**后，httpx 需 `pip install "httpx[socks]"`，否则 `search=github` 会优雅降级为空（urllib/curl 自带 SOCKS 支持，httpx 不带）。

## 合规 / 安全边界（开发前必须澄清）

- **抓取规则**：遵守 robots.txt / 各站点 ToS；控制频率；缓存减少重复抓取。
- **GitHub 许可**：借鉴 GitBox/IdeaScan 等开源项目**复用代码前核对 license**（MIT 可借，未标注的只借方法）。
- **数据保存边界**：报告默认私密；用户数据/项目内容的存储与删除策略要明确（尤其若后续沉淀数据集）。
- **不发布未授权内容**：分析结果默认私密，分享需用户显式操作。
- **Secrets**：任何 API key / token 不入仓库（`.gitignore` 已排除 `.env` / `.ghtoken`）。

## 产品原则守护（不要在后续开发中破坏）

- 毒舌版**不得**新增未经证实的攻击 —— `report.py` 已用代码强制，`test_roast_adds_no_unverified_findings` 守护，改动别绕过。
- 裁判**不得**下"市场上没有竞品"，只能说"本次检索范围内" —— `search_scope_note` 必填。
- 锐评**只针对项目**，不攻击开发者本人。
