# DejaView · 项目锐评（前端）

DejaView 是一个"锐评"用户提交项目的网站：提交一个网站链接（可选 GitHub 仓库）并回答 3 个问题，
选择语气（认真 / 毒舌），后端跑一条流水线并返回一份报告：项目指纹、相似项目、重复度裁判、
亮点、问题与改进建议。

本仓库是 **Next.js（App Router + TypeScript）** 编写的纯前端，零第三方 UI 库、纯 CSS，界面为中文。

## 运行

前端本身不含后端。你需要先启动 FastAPI 后端（默认监听 `http://localhost:8000`）。

```bash
# 1) 安装依赖
npm install

# 2)（可选）配置后端地址
cp .env.local.example .env.local
# 编辑 .env.local，设置 NEXT_PUBLIC_API_BASE 指向你的后端

# 3) 启动开发服务器（默认 http://localhost:3000）
npm run dev
```

生产构建：

```bash
npm run build
npm run start
```

## 环境变量

| 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE` | 后端 FastAPI 基础地址（不要以斜杠结尾） | `http://localhost:8000` |

## 后端接口约定

- `POST /api/analyze` → `{ job_id }`
- `GET /api/jobs/{job_id}` → `Job`
- `POST /api/jobs/{job_id}/confirm` （提交编辑后的项目指纹，恢复流水线）→ `Job`
- `GET /api/health` → `{ ok, provider }`

类型定义见 `lib/types.ts`，请求封装见 `lib/api.ts`。

## 目录结构

```
app/
  layout.tsx              顶栏 + 全局布局
  globals.css             全局样式（浅色/深色自适应）
  page.tsx                提交表单
  report/[jobId]/page.tsx 报告页（轮询 + 状态机）
components/
  StageProgress.tsx       进度条 + 阶段
  FingerprintEditor.tsx   等待确认时可编辑的"项目指纹"卡片
  ReportView.tsx          完成时的报告（认真/毒舌前端切换）
  FindingCard.tsx         可展开证据的"发现"卡片
  Markdown.tsx            极简 Markdown 渲染
lib/
  types.ts                TypeScript 接口
  api.ts                  fetch 封装
  markdown.ts             极简 Markdown → HTML
```

## 关键交互

1. **认真 / 毒舌 前端切换**：报告完成后 `reports.serious` 与 `reports.roast` 一并返回，
   切换语气不会重新请求后端，纯前端切换已获取的两份报告。
2. **逐条证据展开**：每条"发现"（finding）可点击"点开证据"展开其 `evidence[]`
   （来源定位 locator、原文引用 quote、置信度 confidence）。
