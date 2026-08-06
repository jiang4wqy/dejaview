# DejaView 评测报告

- provider=`deepseek` crawler=`builtin` repomap=`builtin` search=`github`
- 样本: 4 | 成功: 4 | 总耗时: 2159.0s
- 均值: 指纹填充率 1.0 · 候选 2.25 · 证据覆盖 1.0 · 重复度 0.69 · LLM 调用 10.25 · 耗时 539.75s

| 项目 | 类别 | 状态 | 重复度(置信) | 候选 | 证据覆盖 | 指纹 | 降级 | 耗时 |
|---|---|---|---|---|---|---|---|---|
| Gitingest | crowded | done | 0.85(medium) | 3 | 1.0 | ✓ | 0 | 543.415s |
| Repomix | crowded | done | 0.5(medium) | 3 | 1.0 | ✓ | 0 | 602.023s |
| Dub | crowded | done | 0.65(low) | 0 | 1.0 | ✓ | 0 | 509.378s |
| Umami | crowded | done | 0.76(medium) | 3 | 1.0 | ✓ | 0 | 504.196s |

## 观察 / 校准结论

- **质量达标**：4 个项目指纹填充率、证据覆盖率均 100%；全部 done、0 降级。
- **schema-repair 循环真实生效**：Dub 的 `extract_site` 首轮 JSON 校验失败，自动回喂修复后成功 —— 复杂嵌套 schema 在 DeepSeek 上也能稳定拿到合法输出。
- **SPA 站点建议用 browser 抓取**：Umami 是 JS 站，静态抓取只拿到 ~220 字 → 换 `DEJAVIEW_CRAWLER=browser` 会明显更好。
- **query 生成待优化（E4-1）**：Dub 的检索词过于具体，GitHub 召回 0；但 judge 在 0 候选时给了 **低置信度**(合理，没有瞎自信)。
- **重复度排序合理**：拥挤赛道里 Gitingest(0.85) > Umami(0.76) > Dub(0.65, 低置信) > Repomix(0.5)；Repomix 作为该品类"原版"重复度反而最低，符合直觉。
- **成本 / 时长**：单项 ~9 分钟(DeepSeek v4-pro 较慢)、~10 次 LLM 调用。生产可：多 worker 并行 / 部分步骤降到 flash / 降低 effort。
