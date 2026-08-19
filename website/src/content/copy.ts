/**
 * All user-visible strings for the DejaView landing site, in Chinese (default)
 * and English. Both objects share the exact same shape so the language toggle
 * is a pure swap.
 *
 * The verdict-demo and persona numbers are NOT invented: they are the real
 * pre-generated `gitingest` report shipped in the repo
 * (`frontend/public/demos/gitingest.json`) — duplication 0.65, the six
 * dimensions, the three verified competitors, and the three tone verdict lines.
 * Keeping them faithful is the whole point of DejaView: 事实不能主观.
 *
 * @module content/copy
 */

export type Lang = 'zh' | 'en'

export const GITHUB_URL = 'https://github.com/jiang4wqy/dejaview'
export const REPO = 'jiang4wqy/dejaview'

export interface NavCopy {
  workflow: string
  verdict: string
  personas: string
  github: string
  /** Accessible label for the language toggle button. */
  langToggleLabel: string
  /** The language it will switch TO, shown on the toggle. */
  langToggleTo: string
}

export interface TerminalStage {
  /** Monospace status label for this stage. */
  label: string
  /** Terminal lines revealed at this stage. */
  lines: string[]
}

export interface WorkflowStep {
  tag: string
  title: string
  desc: string
  /** Small caption shown on the dossier card for this step. */
  cardLabel: string
  /** Chips / rows rendered inside the dossier card. */
  cardItems: string[]
}

export interface Dimension {
  label: string
  /** 0..1 overlap value from the real report. */
  value: number
}

export interface Competitor {
  name: string
  url: string
  relation: string
  stars: number
}

export interface EvidenceItem {
  quote: string
  source: string
  confidence: string
}

export interface Fact {
  label: string
  value: string
}

export interface Persona {
  id: 'serious' | 'roast' | 'comfort'
  mark: string
  name: string
  sub: string
  headline: string
  verdict: string
}

export interface FeatureFact {
  title: string
  desc: string
}

export interface FooterLink {
  label: string
  href: string
}

export interface Copy {
  nav: NavCopy
  hero: {
    badge: string
    titleLines: string[]
    sub: string
    primaryCta: string
    secondaryCta: string
    note: string
  }
  terminal: {
    caseLabel: string
    title: string
    runningLabel: string
    doneLabel: string
    stages: TerminalStage[]
    replay: string
  }
  problem: {
    badge: string
    quote: string
    body: string[]
    nameOrigin: string
  }
  workflow: {
    badge: string
    heading: string
    sub: string
    steps: WorkflowStep[]
  }
  verdict: {
    badge: string
    heading: string
    sub: string
    exhibitLabel: string
    subject: string
    subjectUrl: string
    oneLinerLabel: string
    oneLiner: string
    scoreLabel: string
    scoreVerdict: string
    confidenceLabel: string
    confidence: string
    dimsTitle: string
    dims: Dimension[]
    competitorsTitle: string
    competitors: Competitor[]
    evidenceTitle: string
    evidence: EvidenceItem[]
    disclaimer: string
  }
  personas: {
    badge: string
    heading: string
    sub: string
    factLayerTitle: string
    facts: Fact[]
    personas: Persona[]
    footnote: string
  }
  final: {
    badge: string
    heading: string
    sub: string
    facts: FeatureFact[]
    primaryCta: string
    secondaryCta: string
  }
  footer: {
    tagline: string
    links: FooterLink[]
    disclaimer: string
    license: string
  }
}

// The six real duplication dimensions, shared across languages by value.
const DIM_VALUES = {
  same_problem: 0.9,
  same_users: 0.8,
  same_io_flow: 0.8,
  feature_overlap: 0.7,
  same_mechanism: 0.5,
  unique_proven: 0.7,
} as const

const zh: Copy = {
  nav: {
    workflow: '工作方式',
    verdict: '裁决演示',
    personas: '三种人格',
    github: 'GitHub',
    langToggleLabel: '切换到英文',
    langToggleTo: 'EN',
  },
  hero: {
    badge: '证据化项目鉴定 · 项目照妖镜',
    titleLines: ['在你 all in 之前，', '先照照这轮子', '有没有人造过。'],
    sub: 'DejaView 是一面项目照妖镜：把你的网站、GitHub 或一句话想法往全网照一照，用可核对的证据，替你冷静回答那句最扎心的——「这不就是 XXX 吗？」',
    primaryCta: 'Star on GitHub',
    secondaryCta: '看它怎么工作',
    note: '开源 · MIT · 本地 mock 零成本跑通 · 不调用模型、不花额度',
  },
  terminal: {
    caseLabel: '案卷',
    title: '项目扫描',
    runningLabel: '扫描中',
    doneLabel: '裁决完成',
    stages: [
      {
        label: '接收线索',
        lines: ['> 输入  https://github.com/cyclotruc/gitingest', '  站点 + 仓库 + 作者说明 …… 已接收'],
      },
      {
        label: '提取指纹',
        lines: ['> 指纹  一句话：把任意 Git 仓库转成 LLM 可读文本', '  用户：用 LLM 处理代码库的开发者', '  差异主张：改 URL 的 hub→ingest 一键转换'],
      },
      {
        label: '搜索核验',
        lines: ['> 召回同类 …… 抓取 · 分类 · 逐个核验', '  命中 3 个已验证竞品（含 2 个直接竞品）'],
      },
      {
        label: '六维裁决',
        lines: ['> 重复度  ██████████░░░░░  65%', '  疑似重复 · 置信度 中', '  差异点：一键 URL 转换（已证实）'],
      },
    ],
    replay: '重新扫描',
  },
  problem: {
    badge: '为什么需要它',
    quote: '「这不就是 XXX 吗？」',
    body: [
      'AI 让人人都能造东西了。于是——从前是十个人合力做一个有用的工具，现在是一个人一晚上做十个没用的。',
      '你熬三个通宵做完项目，兴冲冲发进群，第一条回复却把那层既视感一句戳破。那一瞬间的尴尬，DejaView 想帮你提前避免。',
    ],
    nameOrigin: 'DejaView = déjà vu（既视感）+ View（看一眼）。那只眼睛，就是替你往全网照一照的照妖镜。',
  },
  workflow: {
    badge: '工作方式',
    heading: '不是让 AI 吐槽几句，\n是把整条证据链走完。',
    sub: '先形成统一的事实层，最后才切换表达。语气会变，事实不会变——每条重要结论都能展开来源、定位、引文和置信度。',
    steps: [
      {
        tag: '线索',
        title: '接收线索',
        desc: '一个公开网站、一个 GitHub 仓库，甚至只是一句话想法——单个线索也能开工。',
        cardLabel: '输入',
        cardItems: ['网站 URL', 'GitHub 仓库', '一句话想法', '作者说明（可选）'],
      },
      {
        tag: '指纹',
        title: '提取项目指纹',
        desc: '把网站、仓库和作者说明整理成一份统一的项目指纹：定位、用户、问题、输入输出、差异主张。',
        cardLabel: '项目指纹',
        cardItems: ['一句话定位', '目标用户', '要解决的问题', '输入 / 处理 / 输出', '声称的差异点'],
      },
      {
        tag: '核验',
        title: '搜索同类并核验',
        desc: '先召回候选，再逐个抓取、分类、核验——而不是让模型凭记忆列一串名单。',
        cardLabel: '竞品核验',
        cardItems: ['召回 68 个候选', '逐个抓取分类', '3 个通过核验', '标注：直接竞品 / 替代方案'],
      },
      {
        tag: '裁决',
        title: '六维重复度裁决',
        desc: '从六个维度比较重合程度，给出重复度分数，以及你仍然可以占据的位置。',
        cardLabel: '六维裁决',
        cardItems: ['同一个问题', '同一批用户', '输入输出流程', '功能重合', '实现机制', '已证差异'],
      },
      {
        tag: '报告',
        title: '证据化报告',
        desc: '输出带来源、定位、引文和置信度的报告；缺少信息就降低置信度，绝不声称「全网没有竞品」。',
        cardLabel: '报告',
        cardItems: ['统一事实层', '逐条可展开证据', '差异点与改进方向', '置信度标注'],
      },
    ],
  },
  verdict: {
    badge: '裁决演示',
    heading: '结论不是一段文案，\n是一份可以逐条核对的卷宗。',
    sub: '下面是 DejaView 对真实开源项目 gitingest 的预生成裁决——读预生成结果，不调用模型、不花额度。数字与证据均取自仓库内置报告。',
    exhibitLabel: '证物 A · 预生成',
    subject: 'cyclotruc/gitingest',
    subjectUrl: 'https://github.com/cyclotruc/gitingest',
    oneLinerLabel: '项目指纹',
    oneLiner: '将任意 Git 仓库转换为适合 LLM 的文本摘要（digest）',
    scoreLabel: '重复度',
    scoreVerdict: '疑似重复',
    confidenceLabel: '置信度',
    confidence: '中',
    dimsTitle: '六维重合度',
    dims: [
      { label: '同一个问题', value: DIM_VALUES.same_problem },
      { label: '同一批用户', value: DIM_VALUES.same_users },
      { label: '输入输出流程', value: DIM_VALUES.same_io_flow },
      { label: '功能重合', value: DIM_VALUES.feature_overlap },
      { label: '实现机制', value: DIM_VALUES.same_mechanism },
      { label: '已证差异', value: DIM_VALUES.unique_proven },
    ],
    competitorsTitle: '已核验竞品',
    competitors: [
      { name: 'aytzey/CodetoPromptGenerator', url: 'https://github.com/aytzey/CodetoPromptGenerator', relation: '直接竞品', stars: 19 },
      { name: 'DengYiping/codebase-ai-prompt-generator', url: 'https://github.com/DengYiping/codebase-ai-prompt-generator', relation: '直接竞品', stars: 3 },
      { name: 'sriem/nextjs-contextify', url: 'https://github.com/sriem/nextjs-contextify', relation: '替代方案', stars: 4 },
    ],
    evidenceTitle: '证据（可核对）',
    evidence: [
      { quote: 'Turn any Git repository into a simple text digest of its codebase.', source: '网站 · gitingest.com', confidence: '高' },
      { quote: 'Turn any Git repository into a prompt-friendly text ingest for LLMs.', source: 'GitHub README', confidence: '高' },
    ],
    disclaimer: '证据只覆盖本次检索范围与查询当下的快照。没查到只代表「本次范围内没有」，不等于「全世界没人做过」。',
  },
  personas: {
    badge: '三种人格',
    heading: '同一份事实，三副面孔。',
    sub: '换脸不换事实。想冷静尽调、想听毒舌锐评、想先获得一点鼓励——重复度、竞品和证据都不会凭空改变。',
    factLayerTitle: '共享事实层 · 不随人格改变',
    facts: [
      { label: '重复度', value: '65% · 疑似重复' },
      { label: '直接竞品', value: '2 个已核验' },
      { label: '最大短板', value: '没有 API，只认 GitHub' },
      { label: '已证差异', value: '一键 URL 转换（hub→ingest）' },
    ],
    personas: [
      {
        id: 'serious',
        mark: '💰',
        name: '镀金 · 华尔街',
        sub: '像投资委员会一样冷静尽调',
        headline: 'Pass，moat 为零：这个 cute 的小玩意儿，离我们的 term sheet 还差十个 AlphaFold 的距离。',
        verdict: '坦白讲，这个 cute 的项目还没准备好上我们的 investment committee，Pass。',
      },
      {
        id: 'roast',
        mark: '🤡',
        name: '毒舌 · 马戏团',
        sub: '像脱口秀现场一样刻薄，但只攻击项目',
        headline: '又一个把代码库塞进 AI 嘴里的「原创神器」，0.65 重复率，致敬得很用心嘛。',
        verdict: '换了身皮就想当新物种？连 API 都没有的「AI 饲料搅拌机」，在自嗨的山路上飙得挺远。',
      },
      {
        id: 'comfort',
        mark: '🌈',
        name: '彩虹 · 夸夸群',
        sub: '在保留事实的同时提供情绪价值',
        headline: '你做的这个工具，简直是给 LLM 投喂代码的贴心小棉袄！',
        verdict: '你的 gitingest 已经是代码摘要界的小太阳，照到哪里哪里亮，继续闪耀吧！',
      },
    ],
    footnote: '刻薄可以主观，事实不能主观；锐评项目，不攻击开发者本人。',
  },
  final: {
    badge: '开始使用',
    heading: '先照照，再开工。',
    sub: '把 DejaView 拉到本地，十分钟跑通一次完整裁决——默认 mock，不需要任何 API Key。',
    facts: [
      { title: 'MIT 开源', desc: '前后端、流水线、三套主题全部开源，随你 fork。' },
      { title: '可自托管', desc: 'Docker Compose、访问码、单 IP 限流、内部后端端口。' },
      { title: 'mock 零成本', desc: '内置 3 份预生成报告，秒开，不调用模型、不花额度。' },
      { title: '中英双语', desc: '界面与报告一键切换中 / EN，文档双语齐备。' },
    ],
    primaryCta: 'Star on GitHub',
    secondaryCta: '阅读架构文档',
  },
  footer: {
    tagline: '在你 all in 之前，先照照这轮子有没有人造过。',
    links: [
      { label: '源码', href: 'https://github.com/jiang4wqy/dejaview' },
      { label: '架构', href: 'https://github.com/jiang4wqy/dejaview/blob/main/docs/ARCHITECTURE.md' },
      { label: '部署', href: 'https://github.com/jiang4wqy/dejaview/blob/main/docs/DEPLOYMENT.md' },
      { label: '许可证', href: 'https://github.com/jiang4wqy/dejaview/blob/main/LICENSE' },
    ],
    disclaimer: '真实搜索是尽力而为，报告代表「本次检索范围内」的证据，不是法律、投资或市场保证。',
    license: 'MIT © jiang4wqy',
  },
}

const en: Copy = {
  nav: {
    workflow: 'How it works',
    verdict: 'The verdict',
    personas: 'Three personas',
    github: 'GitHub',
    langToggleLabel: 'Switch to Chinese',
    langToggleTo: '中',
  },
  hero: {
    badge: 'Evidence-based project critique · the mirror',
    titleLines: ['Before you go all in,', 'check whether that wheel', 'already exists.'],
    sub: 'DejaView is a mirror for your project. Hold a website, a GitHub repo, or a one-line idea up to the whole web, and get an evidence-backed answer to the reply every builder dreads — "isn\'t this just XXX?"',
    primaryCta: 'Star on GitHub',
    secondaryCta: 'See how it works',
    note: 'Open source · MIT · runs end-to-end in free mock mode · no model call, no cost',
  },
  terminal: {
    caseLabel: 'CASE',
    title: 'PROJECT SCAN',
    runningLabel: 'SCANNING',
    doneLabel: 'VERDICT READY',
    stages: [
      {
        label: 'INTAKE',
        lines: ['> input  https://github.com/cyclotruc/gitingest', '  site + repo + author note … received'],
      },
      {
        label: 'FINGERPRINT',
        lines: ['> print  one-liner: turn any Git repo into LLM-ready text', '  users: devs feeding a codebase to an LLM', '  claimed edge: one-line hub→ingest URL swap'],
      },
      {
        label: 'SEARCH · VERIFY',
        lines: ['> recall peers … fetch · classify · verify', '  3 verified competitors (2 direct)'],
      },
      {
        label: 'VERDICT',
        lines: ['> duplication  ██████████░░░░░  65%', '  likely a duplicate · confidence: medium', '  edge: one-line URL swap (proven)'],
      },
    ],
    replay: 'Re-run scan',
  },
  problem: {
    badge: 'Why it exists',
    quote: '"Isn\'t this just XXX?"',
    body: [
      'AI lets anyone build anything. So the ratio flipped: ten people used to build one useful tool; now one person ships ten useless ones overnight.',
      'You ship after three sleepless nights, drop it in the group chat — and the first reply pops that flash of déjà vu in a single line. That flush of embarrassment is exactly what DejaView is here to spare you.',
    ],
    nameOrigin: 'DejaView = déjà vu + View. The eye in the logo is the mirror that holds your project up against the whole web.',
  },
  workflow: {
    badge: 'How it works',
    heading: 'Not an LLM writing a\nharsher paragraph — the\nwhole evidence chain.',
    sub: 'Build one shared fact layer first; change presentation last. The tone changes, the facts do not — every finding expands into source, locator, quote, and confidence.',
    steps: [
      {
        tag: 'CLUE',
        title: 'Take the clue',
        desc: 'A public website, a GitHub repository, or just a one-line idea — a single clue is enough to start.',
        cardLabel: 'Input',
        cardItems: ['Website URL', 'GitHub repo', 'One-line idea', 'Author note (optional)'],
      },
      {
        tag: 'PRINT',
        title: 'Extract the fingerprint',
        desc: 'Fold website, repo, and author notes into one project fingerprint: positioning, users, problem, I/O, and claimed edge.',
        cardLabel: 'Project fingerprint',
        cardItems: ['One-line positioning', 'Target users', 'Problem solved', 'Input / process / output', 'Claimed differentiator'],
      },
      {
        tag: 'VERIFY',
        title: 'Search peers & verify',
        desc: 'Recall candidates, then fetch, classify, and verify each one — instead of asking a model to list names from memory.',
        cardLabel: 'Competitor check',
        cardItems: ['68 candidates recalled', 'Each fetched & classified', '3 pass verification', 'Tagged: direct / alternative'],
      },
      {
        tag: 'VERDICT',
        title: 'Six-dimension verdict',
        desc: 'Compare overlap across six dimensions, then give a duplication score and the space you can still own.',
        cardLabel: 'Six dimensions',
        cardItems: ['Same problem', 'Same users', 'Same I/O flow', 'Feature overlap', 'Same mechanism', 'Proven edge'],
      },
      {
        tag: 'REPORT',
        title: 'Evidence-backed report',
        desc: 'A report carrying source, locator, quote, and confidence. Missing info lowers confidence — it never claims "no competitor exists".',
        cardLabel: 'Report',
        cardItems: ['Shared fact layer', 'Per-finding evidence', 'Edge & improvements', 'Confidence flags'],
      },
    ],
  },
  verdict: {
    badge: 'The verdict',
    heading: 'A verdict is not a paragraph —\nit is a case file you can\ncheck line by line.',
    sub: "Here is DejaView's pre-generated verdict on the real open-source project gitingest — read from a pre-generated result, no model call, no cost. Every number and quote comes from the report shipped in the repo.",
    exhibitLabel: 'EXHIBIT A · pre-generated',
    subject: 'cyclotruc/gitingest',
    subjectUrl: 'https://github.com/cyclotruc/gitingest',
    oneLinerLabel: 'Project fingerprint',
    oneLiner: 'Turn any Git repository into an LLM-friendly text digest.',
    scoreLabel: 'Duplication',
    scoreVerdict: 'Likely a duplicate',
    confidenceLabel: 'Confidence',
    confidence: 'Medium',
    dimsTitle: 'Six-dimension overlap',
    dims: [
      { label: 'Same problem', value: DIM_VALUES.same_problem },
      { label: 'Same users', value: DIM_VALUES.same_users },
      { label: 'Same I/O flow', value: DIM_VALUES.same_io_flow },
      { label: 'Feature overlap', value: DIM_VALUES.feature_overlap },
      { label: 'Same mechanism', value: DIM_VALUES.same_mechanism },
      { label: 'Proven edge', value: DIM_VALUES.unique_proven },
    ],
    competitorsTitle: 'Verified competitors',
    competitors: [
      { name: 'aytzey/CodetoPromptGenerator', url: 'https://github.com/aytzey/CodetoPromptGenerator', relation: 'Direct competitor', stars: 19 },
      { name: 'DengYiping/codebase-ai-prompt-generator', url: 'https://github.com/DengYiping/codebase-ai-prompt-generator', relation: 'Direct competitor', stars: 3 },
      { name: 'sriem/nextjs-contextify', url: 'https://github.com/sriem/nextjs-contextify', relation: 'Alternative', stars: 4 },
    ],
    evidenceTitle: 'Evidence (checkable)',
    evidence: [
      { quote: 'Turn any Git repository into a simple text digest of its codebase.', source: 'Website · gitingest.com', confidence: 'High' },
      { quote: 'Turn any Git repository into a prompt-friendly text ingest for LLMs.', source: 'GitHub README', confidence: 'High' },
    ],
    disclaimer: 'Evidence covers only this search run, at query time. A miss means "not found within this run" — not proof that nobody, anywhere, has built it.',
  },
  personas: {
    badge: 'Three personas',
    heading: 'Same facts. Three faces.',
    sub: 'A new face, not new facts. Cool diligence, a sharp roast, or a little encouragement first — the duplication, competitors, and evidence never change out from under you.',
    factLayerTitle: 'Shared fact layer · fixed across personas',
    facts: [
      { label: 'Duplication', value: '65% · likely a duplicate' },
      { label: 'Direct competitors', value: '2 verified' },
      { label: 'Biggest gap', value: 'No API, GitHub-only' },
      { label: 'Proven edge', value: 'One-line URL swap (hub→ingest)' },
    ],
    personas: [
      {
        id: 'serious',
        mark: '💰',
        name: 'Gilt · Wall Street',
        sub: 'Calm diligence, like an investment committee',
        headline: 'Pass, moat: zero. This cute little toy is still ten AlphaFolds away from touching a term sheet from us.',
        verdict: "Frankly, this cute project isn't ready for our investment committee yet. Pass.",
      },
      {
        id: 'roast',
        mark: '🤡',
        name: 'Roast · Circus',
        sub: 'Sharp as a stand-up set — but aimed only at the project',
        headline: 'Yet another "originality miracle" that crams the codebase down an AI\'s throat. 0.65 duplication — a very heartfelt homage, huh.',
        verdict: "Changed your skin and think you're a new species? An 'AI feed mixer' with no API, gunning it far down the self-hype road.",
      },
      {
        id: 'comfort',
        mark: '🌈',
        name: 'Comfort · Cheer squad',
        sub: 'Emotional value, without bending the facts',
        headline: "This tool you made? It's practically a warm, thoughtful little jacket for feeding code to LLMs!",
        verdict: 'Your gitingest is already the little sun of the code-summary world — wherever it shines, it lights things up. Keep shining!',
      },
    ],
    footnote: 'The bite can be subjective; the facts cannot. Roast the project, never the person.',
  },
  final: {
    badge: 'Get started',
    heading: 'Mirror first, then build.',
    sub: 'Pull DejaView down and run a full verdict in ten minutes — mock by default, no API key required.',
    facts: [
      { title: 'MIT open source', desc: 'Frontend, backend, pipeline, and all three themes — fork it all.' },
      { title: 'Self-hostable', desc: 'Docker Compose, access code, per-IP limits, internal API port.' },
      { title: 'Free mock mode', desc: 'Three pre-generated reports open instantly — no model call, no cost.' },
      { title: 'Bilingual', desc: 'UI and reports toggle 中 / EN; docs shipped in both languages.' },
    ],
    primaryCta: 'Star on GitHub',
    secondaryCta: 'Read the architecture',
  },
  footer: {
    tagline: 'Before you go all in, check whether that wheel already exists.',
    links: [
      { label: 'Source', href: 'https://github.com/jiang4wqy/dejaview' },
      { label: 'Architecture', href: 'https://github.com/jiang4wqy/dejaview/blob/main/docs/ARCHITECTURE.md' },
      { label: 'Deployment', href: 'https://github.com/jiang4wqy/dejaview/blob/main/docs/DEPLOYMENT.md' },
      { label: 'License', href: 'https://github.com/jiang4wqy/dejaview/blob/main/LICENSE' },
    ],
    disclaimer: 'Search is best effort; a report reflects evidence found within that run — not legal, investment, or market advice.',
    license: 'MIT © jiang4wqy',
  },
}

export const COPY: Record<Lang, Copy> = { zh, en }
