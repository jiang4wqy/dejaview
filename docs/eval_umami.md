# 实测：对 Umami 的一次真实检测（dogfood）

对一个真实、知名的开源项目跑完整流水线，验证"证据化锐评 + 一键双语气"在真实数据上成立。

- **被测**：`https://umami.is` + `https://github.com/umami-software/umami`（隐私优先的自托管网站分析）
- **配置**：`provider=deepseek`、`crawler=browser`(headless Chrome)、`repomap=builtin`、`search=composite(github,v2ex)`
- **作者自述**：问题=隐私友好的网站分析；用户=在意隐私的网站主；新意=无 Cookie 自托管
- **时间**：2026-08-06

## 结论摘要

| 项 | 值 |
|---|---|
| 项目指纹 | "隐私优先的自托管网站分析平台，无 Cookie 跟踪流量/行为/转化/收入" —— 无需人工纠正 |
| 重复造轮子概率 | **0.80（high）** |
| 维度 | 同问题/同用户一致，功能重合 0.9，机制 0.8（思想同、实现异），独有且已证明 0.2 |
| 召回竞品 | **plausible/analytics、milesmcc/shynet、RavelloH/InsightFlare**（均判为 direct_competitor） |
| 物证 | 6 条 finding 全部带 locator（README.md / docker-compose.yml / db/clickhouse/schema.sql / 官网 / 竞品摘要） |
| 不变量 | ✔ **毒舌版没有新增未证实的结论**（代码强校验通过） |
| 成本 | 11 次 LLM 调用 · in 26.7k / out 26.2k tok · 8 次检索 · 430s |

真实找到的问题里含一条 critical（官网内容抓取过薄→被判为"可用性存疑"）与两条"卖点同质化/功能高度重复"，都可回溯到证据；两条优点（自托管、ClickHouse 列存）也带代码定位。认真版给了 5 条按影响×成本排序的改进；毒舌版是同一批事实换了张嘴脸。

## 本次暴露并修复的框架问题：GitHub 检索召回

第一次跑（旧代码）时 GitHub **每条 query 都 0 命中**，重复度裁判只能靠 V2EX 讨论支撑，证据偏弱：

```
github '隐私友好 网站分析 无cookie 不追踪个人 服务器端聚合' -> 0
github 'privacy friendly web analytics cookieless server side tracking for ...' -> 0
（8 条全 0）
```

**根因**：GitHub 仓库搜索是 AND 语义——词越多命中越少；而 fingerprint 生成的是长自然语言 query，几乎必然 0 结果。V2EX 的全文搜索不受影响，所以只有 GitHub 空手而归。

**修复**（`providers/search_client.py`）：GitHub 源在查询前把长 query 收窄到高信号关键词（去填充词、取前 4 个），命中为空再放宽到前 2 个重试一次：

```
github 'privacy friendly web analytics cookieless ...' (kw='privacy web analytics cookieless') -> 5
github 'cookie-less website tracking' (kw='cookie-less website tracking') -> 1
（8 条：5,5,1,5,5,5,5,3）
```

于是裁判从"只有社区讨论"升级为"锚定在真实直接竞品（Plausible 等）"，重复度结论更有底气。已加单测 `test_keywordize_shrinks_long_query` 固化该行为。

## 已知局限（诚实记录）

- 官网是 JS 重站，headless 抓到的正文偏薄（~900 字），模型据此把"内容太少"读成了"可用性存疑"——属抓取深度不足导致的偏保守判断，不是编造；后续可加"等待水合/滚动加载"。
- 检索边界已在报告里显式声明：仅覆盖本次召回到的竞品，不代表市场全集。
