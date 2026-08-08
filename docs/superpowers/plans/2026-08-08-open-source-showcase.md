# DejaView 开源展示强化实施计划

依据：`docs/superpowers/specs/2026-08-08-open-source-showcase-design.md`

原则：只改与开源展示、安全基线和可读性直接相关的内容；每批修改独立验证；不重构分析流水线。

## 批次 0：建立基线

涉及文件：无。

1. 记录当前分支、提交和工作区状态。
2. 运行后端现有 pytest。
3. 运行前端现有 TypeScript 检查与生产构建。
4. 记录当前 `npm audit --audit-level=high` 结果。

验证：取得可对比的测试、构建和依赖审计基线。

## 批次 1：清理公开资源并补齐开源入口

涉及文件：

- `LICENSE`
- `CONTRIBUTING.md`
- `SECURITY.md`
- `.gitignore`
- `.gitleaks.toml`
- `frontend/public/demos/gitingest.json`
- `frontend/public/demos/kutt.json`
- `frontend/public/fonts/Fredoka.ttf`
- `frontend/public/fonts/OFL-Fredoka.txt`

步骤：

1. 添加 MIT 许可证、贡献指南和安全政策。
2. 补充忽略规则，不改变现有例外语义。
3. 从当前 demo 中移除过期 S3 签名 URL及不必要邮箱痕迹，保持 JSON schema。
4. 用官方 Google Fonts Fredoka TTF 和 OFL 许可证替换错误 HTML。
5. 为历史中已复核的单一过期 S3 命中增加精确 Gitleaks 豁免。

验证：

- JSON 可解析；
- Fredoka 文件头为合法 TTF；
- 当前树 Gitleaks 无未豁免命中；
- `git diff --check` 通过。

## 批次 2：升级前端依赖并建立自动化基线

涉及文件：

- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/Dockerfile`
- `.github/dependabot.yml`
- `.github/ISSUE_TEMPLATE/bug_report.yml`
- `.github/ISSUE_TEMPLATE/feature_request.yml`
- `.github/pull_request_template.md`
- `.github/workflows/ci.yml`

步骤：

1. 升级到 `next@16.3.0`，声明 Node `>=20.9.0`。
2. 调整 Next.js 16 不再支持的 lint 脚本，增加 `typecheck` 和 `audit` 脚本。
3. 同步锁文件与 Docker Node 版本。
4. 添加 npm/pip Dependabot 配置。
5. 添加 Issue/PR 模板。
6. 添加 CI：Gitleaks、后端 pytest、前端类型检查/审计/构建、Compose 配置验证。

验证：

- `npm ci`；
- `npm run typecheck`；
- `npm run build`；
- `npm audit --audit-level=high`。

若 Next.js 16 触发超出本规格的大规模迁移，停止升级并报告，不隐式扩大范围。

## 批次 3：后端访问控制与部署安全

涉及文件：

- `backend/app/security.py`
- `backend/app/config.py`
- `backend/app/main.py`
- `backend/app/ratelimit.py`（仅在职责需要时）
- `backend/tests/test_access.py`
- `backend/tests/test_security.py`
- `backend/tests/test_config.py`
- `backend/requirements.txt`
- `backend/requirements-dev.txt`
- `backend/Dockerfile`
- `backend/.env.example`
- `deploy.env.example`
- `docker-compose.yml`
- `render.yaml`

步骤：

1. 先扩充访问控制测试，覆盖任务列表、任务详情、确认和报告读取。
2. 添加安全模块，集中访问码、可信代理 IP 和敏感值遮蔽。
3. 将除 health/access 外的业务接口统一接入鉴权依赖。
4. 解析 CORS 来源和可信代理配置，移除生产默认通配来源。
5. 前端请求统一携带访问码。
6. Docker 后端改为内部 `expose`，添加前后端健康检查。
7. 更新 Render 和 env 示例，但不写入任何真实值。
8. 分离运行与开发依赖并记录验证版本。

验证：

- 先观察新增鉴权测试失败，再实现到通过；
- 完整 pytest；
- `docker compose config`；
- 检查主机端口只映射 `3000`。

## 批次 4：首页组件与交互可读性

涉及文件：

- `frontend/app/page.tsx`
- `frontend/app/layout.tsx`
- `frontend/app/report/[jobId]/page.tsx`
- `frontend/components/Intro.tsx`
- `frontend/components/WorldGate.tsx`
- `frontend/components/AppChrome.tsx`
- `frontend/components/AccessGate.tsx`
- `frontend/components/ProjectForm.tsx`
- `frontend/components/DemoPicker.tsx`
- `frontend/lib/showcase-data.ts`
- `frontend/lib/api.ts`

步骤：

1. 抽取表单、demo 入口和展示数据，使 `page.tsx` 只负责流程。
2. 首页增加开始审判、直接看示例、可信度和 GitHub/文档入口。
3. 修正三种人格相关的旧“两种模式”文案。
4. 顶栏增加开源导航并保持移动端核心操作。
5. 完善访问码、限流、服务不可用和轮询错误状态。
6. 增加分享元数据和准确的页面语言。

验证：

- TypeScript 类型检查；
- 生产构建；
- mock 提交、demo 深链、人格切换和错误状态 smoke test。

## 批次 5：拆分样式并验证视觉

涉及文件：

- `frontend/app/globals.css`
- `frontend/styles/base.css`
- `frontend/styles/intro.css`
- `frontend/styles/worlds.css`
- `frontend/styles/form.css`
- `frontend/styles/report.css`
- `frontend/styles/responsive.css`

步骤：

1. 按原有选择器职责移动 CSS，保持导入和级联顺序。
2. 合并本次改造产生的重复规则，不清理无关样式。
3. 增加清晰焦点状态和 `prefers-reduced-motion`。
4. 修复 360px 下的横向滚动和控件重叠。

验证：

- 生产构建；
- 桌面、360px 与减少动画三种浏览器截图；
- 镀金、毒舌、彩虹三种主题和报告页人工对比。

## 批次 6：中英文文档与架构说明

涉及文件：

- `README.md`
- `README_EN.md`
- `docs/ARCHITECTURE.md`
- `docs/DEPLOYMENT.md`
- `docs/TODO.md`
- `docs/BACKLOG.md`

步骤：

1. 重写中文 README，并提供结构一致的英文版。
2. 使用实际验证命令更新快速开始、配置和项目状态。
3. 更新架构数据流、模块边界和事实层不变量。
4. 分离 mock、本地、Docker、Render 部署说明。
5. 删除已完成或与当前代码冲突的 TODO/BACKLOG 条目。

验证：

- 中英文关键命令、端口、环境变量和链接一致；
- Markdown 链接与 Mermaid 语法检查；
- README 声明与实际测试结果一致。

## 批次 7：最终验收

1. 后端完整 pytest。
2. 前端 `npm ci`、类型检查、生产构建和 high 级依赖审计。
3. Gitleaks 当前树与历史扫描。
4. `docker compose config` 与健康检查。
5. 浏览器完成首页、demo、mock 分析、访问码和报告流程验收。
6. 检查工作区、diff、敏感文件名和大文件。
7. 提交分批变更；未获授权前不推送远程主分支。

最终交付：修改摘要、验证结果、仍存在的限制、提交列表和建议的推送/PR步骤。
