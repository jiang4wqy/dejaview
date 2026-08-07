# DejaView 评测报告

> 样例(mock 机制演示, 各行指标相同属正常)。真实校准: 配好 `backend/.env` 后 `make eval`(慢, 有 token 成本)。

- provider=`mock` crawler=`stub` repomap=`stub` search=`mock`
- 样本: 6 | 成功: 6 | 总耗时: 0.0s
- 均值: 指纹填充率 1.0 · 候选 3.0 · 证据覆盖 0.75 · 重复度 0.72 · LLM 调用 11.0 · 耗时 0.0s

| 项目 | 类别 | 状态 | 重复度(置信) | 候选 | 证据覆盖 | 指纹 | 降级 | 耗时 |
|---|---|---|---|---|---|---|---|---|
| Gitingest | crowded | done | 0.72(medium) | 3 | 0.75 | ✓ | 0 | 0.001s |
| Repomix | crowded | done | 0.72(medium) | 3 | 0.75 | ✓ | 0 | 0.0s |
| Dub | crowded | done | 0.72(medium) | 3 | 0.75 | ✓ | 0 | 0.0s |
| Umami | crowded | done | 0.72(medium) | 3 | 0.75 | ✓ | 0 | 0.0s |
| Plausible | crowded | done | 0.72(medium) | 3 | 0.75 | ✓ | 0 | 0.0s |
| Excalidraw | crowded | done | 0.72(medium) | 3 | 0.75 | ✓ | 0 | 0.0s |
