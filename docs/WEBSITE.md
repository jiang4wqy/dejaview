# DejaView 宣传站设计（design of record）

状态：已实现并通过验证。实现位于仓库根目录 `website/`，部署工作流
`.github/workflows/pages.yml`。本文件记录设计意图与边界，供后续维护参考。

## 1. 目标

在仓库根目录新增独立静态宣传站 `website/`，以吸引 GitHub Star 为首要目标。默认
中文、可切换英文；不替换、不依赖 `frontend/` 产品应用，不调用后端、不消耗模型额度。

成功标准：

1. 新访客首屏即理解 DejaView 是「证据化项目鉴定 / 项目照妖镜」。
2. 通过滚动叙事展示输入、项目指纹、竞品核验、六维裁决、证据报告与三种人格。
3. 主 CTA 始终指向 `https://github.com/jiang4wqy/dejaview`，以 Star 为核心行动。
4. 中英内容完整对应；切换语言不刷新页面并保留选择（`localStorage`）。
5. 生产构建部署到 `https://jiang4wqy.github.io/dejaview/`，所有资源在 `/dejaview/`
   子路径下正常加载。
6. 375 / 768 / 1024 / 1440 无横向滚动，键盘焦点可见，支持 `prefers-reduced-motion`。

## 2. 非目标

- 不修改 `frontend/`、`backend/` 或现有分析流水线与 `ci.yml`。
- 不接入在线分析、登录、表单、统计、评论或后端 API。
- 不虚构在线服务、用户评价、Star 数量或性能数据。
- 不引入大型 UI 组件库或重量级动画框架，不使用 GSAP、不加载 web 字体。

## 3. 页面叙事

- **导航**：Logo、工作方式、裁决演示、三种人格、中/EN 切换、GitHub CTA；窄屏隐藏
  次要锚点，保留 Logo、语言切换与 Star 按钮。
- **首屏**：主标题 + 定位 + 两个 CTA（`Star on GitHub` 主 / `看它怎么工作` 次），
  右侧为 HTML/CSS 组成的「项目扫描终端」，分阶段演示输入→指纹→竞品命中→重复度裁决，
  仅播放预生成内容，不发起真实请求。
- **痛点**：「这不就是 XXX 吗？」大字引语 + 情绪共鸣文案 + 名字由来。
- **工作方式**：桌面端粘性滚动，左侧五步依次点亮，右侧卷宗卡片随步骤更新；移动端
  改为纵向步骤卡片。
- **裁决演示**：使用仓库内置 `gitingest` 预生成报告——重复度 0→65% 表盘动画、六维
  重合度条、三个已核验竞品、可核对证据引文。明确标记「证物 A · 预生成」。
- **三种人格**：同一份事实层（65% / 2 个直接竞品 / 缺 API / 一键 URL 转换差异）固定
  不变，切换镀金 / 毒舌 / 彩虹三副面孔（headline、verdict、主题截图、配色随之变化）。
- **收尾**：MIT、可自托管、mock 零成本、中英双语四项事实 + GitHub CTA + 页脚链接。

**真实性**：裁决与人格中的所有数字、竞品、引文均取自
`frontend/public/demos/gitingest.json`（重复度 0.65；六维 same_problem 0.9 /
same_users 0.8 / same_io_flow 0.8 / feature_overlap 0.7 / same_mechanism 0.5 /
unique_proven 0.7；竞品 aytzey/CodetoPromptGenerator 等；三种语气的真实
headline/verdict）。刻薄可以主观，事实不能主观。

## 4. 视觉与交互

- 风格「霓虹扫描仪 / 赛博照妖镜」：午夜靛蓝背景 `#0B0B1E`，冷白正文 `#ECECFF`，三个
  高饱和霓虹按分区各司其职——品红 `#FF2E97`（品牌 / 首屏 / 毒舌人格）、电青 `#16E0FF`
  （交互 / 工作方式 / 彩虹人格）、琥珀 `#FFB020`（证据 / 裁决 / 镀金人格）；一区一主色、
  不撞近似色。等宽标签 + 案卷编号 + 坐标网格营造取证感。Logo/图标为内联 SVG，复用
  品红→紫→电青品牌渐变。
- 动画只用 CSS + React 状态 + 浏览器原生 API：首屏标题分行淡入上移、终端扫描线、
  章节进入视口的透明度/位移 reveal（`IntersectionObserver`）、重复度数字首次进入
  视口从 0 增长到 65、三人格经 CSS 变量切换配色。所有交互目标 ≥ 44×44px。
- `prefers-reduced-motion: reduce` 下取消自动增长、循环扫描、悬浮与大幅位移，仅保留
  即时状态切换。

## 5. 技术与部署

React + TypeScript + Vite。`src/content/copy.ts` 定义结构一致的 `zh`/`en` 文案；
语言选择写入 `localStorage`，默认中文。`vite.config.ts` 设 `base: '/dejaview/'`。

`.github/workflows/pages.yml`：在 `main` 分支 `website/**` 或工作流自身变化时触发，
`npm ci` → `npm run build`（`tsc --noEmit && vite build`）→ 上传 `website/dist` →
官方 Pages action 部署。仅新增 `pages`/`id-token` 权限，不改动 `ci.yml` 与 Render。
**首次启用前**需在 Settings → Pages 将 Source 设为 GitHub Actions。

## 6. 降级

- `localStorage` 不可用时仍可在当前会话切换语言。
- `IntersectionObserver` 不可用时直接显示全部内容（reveal 立即为可见）。
- 图片加载失败保留尺寸与替代文字。
- 无 JavaScript 时，`index.html` 的 `<noscript>` 显示核心定位与 GitHub 链接。

## 7. 验证（已执行）

- `tsc --noEmit` 通过；`vite build` 通过；构建产物中脚本、样式、图片路径均带
  `/dejaview/` 基础路径。
- 无头 Chromium 实测：1440 / 768 / 390 均无横向滚动、控制台无报错；语言切换、
  人格切换生效；滚动后 reveal 生效、重复度表盘到达 65%、六维条填充为
  90/80/80/70/50/70；移动端粘性面板隐藏、内联卡片显示。

## 8. 交付边界

仅新增 `website/`、`.github/workflows/pages.yml` 与本设计文档。未修改任何产品代码、
产品 CI、Render 配置或仓库安全设置。
