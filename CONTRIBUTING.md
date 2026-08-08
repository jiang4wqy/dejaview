# Contributing to DejaView

感谢你愿意改进 DejaView。项目优先接受可验证、范围清晰且不破坏事实层不变量的贡献。

## 开发环境

- Python 3.10+
- Node.js 20.9+
- Git

后端：

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
pytest
```

前端：

```bash
cd frontend
npm ci
npm run typecheck
npm run build
```

默认 mock 模式不需要 API Key，也不会产生模型费用。

## 提交修改

1. 从 `main` 创建聚焦单一问题的分支。
2. 修改前先运行相关测试，记录基线。
3. 只触碰与问题直接相关的文件，不顺带重构。
4. 新行为必须有测试或明确的手动验证步骤。
5. 提交前运行后端测试、前端类型检查和生产构建。

Pull Request 请说明：问题、解决方式、验证结果、界面变化截图，以及是否影响成本、隐私或事实层。

## 适合首次贡献的方向

- 改善文档、错误提示和无障碍体验；
- 为已有 provider 增加测试；
- 增加经过核验的搜索来源；
- 修复带有复现步骤的 bug。

改变评分含义、事实层 schema、模型提示词或证据规则前，请先开 Issue 讨论。三种语气可以改变表达，但不能新增事实。
