"use client";

// 轻量 i18n：不引入依赖，手写字典 + React Context。
// 语言存 localStorage(key dejaview_lang)，默认 'zh'。
// getLang() 是给非组件代码（lib/api.ts）用的同步读取，避免它依赖 hook。
//
// 范围说明：这里只覆盖"界面外壳"文案(按钮/标题/标签/提示/空状态)。
// 后端按 language 字段生成的报告正文/指纹/裁决(job.reports[*].body_markdown 等)
// 不在这份字典里 —— 那些跟随后端语言，不由前端翻译。
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Lang = "zh" | "en";

const KEY = "dejaview_lang";

const zh = {
  // ===== 顶栏 =====
  "topbar.tagline": "// 证据化项目锐评",
  "topbar.navAriaLabel": "开源项目导航",
  "topbar.demo": "示例",
  "topbar.deploy": "部署",
  "topbar.github": "GitHub ↗",
  "topbar.restartTitle": "回到最开始的介绍页",
  "topbar.restart": "↻ 从头",
  "topbar.personaSwitchTitle": "切到「{name}」",
  "topbar.personaSwap": "切 {emoji}",
  "topbar.langSwitchAria": "切换界面语言",

  // ===== 进站门 AccessGate =====
  "access.checkingSub": "正在确认公开演示的访问状态…",
  "access.lockedSub": "部署者已开启访问保护 · 请输入访问口令",
  "access.codeLabel": "访问口令",
  "access.codePlaceholder": "访问口令",
  "access.err": "口令不对，请检查后再试。",
  "access.verifying": "验证中…",
  "access.enter": "进站 →",

  // ===== 首页 =====
  "home.loading": "正在打开卷宗…",
  "home.back": "← 换个审判官",
  "home.flowAriaLabel": "分析流程",
  "home.flow.fingerprint": "提取指纹",
  "home.flow.search": "搜索同类",
  "home.flow.verify": "验证证据",
  "home.flow.judge": "裁判重复度",

  // ===== 示例选择 DemoPicker =====
  "demo.compactLabel": "先看已跑好的报告：",
  "demo.fullLabel": "已跑好的示例报告 · 秒开，不消耗 API Key：",
  "demo.dupLabel": "重复度",

  // ===== 提交表单 ProjectForm =====
  "form.examplesLabel": "没项目练手？填入公开示例：",
  "form.clueLabel": "贴上你的项目",
  "form.cluePlaceholder": "网址 / GitHub / 一句话描述（例：帮宠物主记录疫苗时间的小程序）",
  "form.clueHint": "一条线索就够——有公开网址最准，纯想法也能测。",
  "form.moreShow": "＋ 补充更多线索（可选，结论更准）",
  "form.moreHide": "－ 收起补充线索",
  "form.githubLabel": "GitHub 仓库（可选）",
  "form.targetUsersLabel": "目标用户是谁？",
  "form.targetUsersPlaceholder": "例如：需要快速整理会议纪要的产品经理",
  "form.problemLabel": "解决了什么问题？",
  "form.problemPlaceholder": "例如：把散乱语音一键转成结构化纪要",
  "form.noveltyLabel": "你认为的创新点？",
  "form.noveltyPlaceholder": "例如：本地推理 + 说话人分离，隐私不出端",
  "form.confirmFpLabel": "搜索前让我确认项目指纹（省 Token，也更准）",
  "form.privacyBold": "提交前请确认：",
  "form.privacyRest":
    "mock 模式不消耗 Key；真实模式会消耗部署者额度。请勿提交私有仓库、内网地址或敏感业务资料。",
  "form.errNoClue": "给一条线索就行：贴网址、GitHub，或用一句话描述你的项目。",
  "form.errSubmitFail": "提交失败，请稍后重试。",
  "form.submitting": "过堂中…",
  "form.judgeLabel": "审判官：",
  "form.judgeSwitchHint": "· 顶栏可随时换脸",

  // ===== 报告页 app/report/[jobId] =====
  "report.backHome": "← 返回，换个项目",
  "report.recheckTooltip": "用同一目标再跑一遍，对比改版前后",
  "report.rechecking": "复检中…",
  "report.recheck": "↻ 复检",
  "report.recheckFailed": "复检失败",
  "report.caseLabel": "卷宗 {jobId}",
  "report.expiredKicker": "// 卷宗遗失",
  "report.expiredTitle": "该分析已过期或不存在",
  "report.expiredBody":
    "可能是任务已被清理、链接过期，或服务刚刚重启导致进度丢失——重新提交一次就好。",
  "report.resubmitting": "重新提交中…",
  "report.reanalyze": "重新分析这个项目",
  "report.backHomeRestart": "返回首页重新开始",
  "report.errorTitle": "出错了",
  "report.reconnect": "重新连接",
  "report.backHomeLink": "返回首页",
  "report.investigatingKicker": "// 调查中…",
  "report.fetchingCase": "正在调取卷宗…",
  "report.abortedKicker": "// 调查中止",
  "report.analysisFailedTitle": "分析失败",
  "report.unknownError": "未知错误。",
  "report.connIssue": "连接异常：{message}（正在重试…）",
  "report.subjectFallback": "本项目",

  // ===== 请求层错误文案 lib/api.ts（非组件代码，走 tSync）=====
  "api.connError": "暂时无法连接分析服务。请确认后端已启动，或稍后重试。",
  "api.accessExpired": "访问码已失效或无权限。请刷新页面后重新验证。",
  "api.notFound": "找不到这份任务或报告；它可能已过期，或服务刚刚重启。",
  "api.tooManyRequests": "请求过于频繁，请稍后再试。",
  "api.serviceUnavailable": "分析服务暂时不可用，请稍后重试。",
  "api.requestFailed": "请求失败（{status}）",

  // ===== 等待/进度 StageProgress =====
  "stage.site_analysis": "分析网站",
  "stage.github_analysis": "分析仓库",
  "stage.fingerprint": "合成项目指纹",
  "stage.search": "搜索相似项目",
  "stage.verify": "验证候选",
  "stage.judge": "重复度裁判",
  "stage.factlayer": "汇总事实层",
  "stage.render": "生成报告",
  "stage.done": "完成",
  "stage.queued": "排队中",
  "stage.processingFallback": "处理中",
  "stage.waitKickerRoast": "// 后台正在开嘲…",
  "stage.waitKickerComfort": "// 夸夸群正在集合…",
  "stage.waitKickerSerious": "// 委员会正在评估…",
  "stage.caption": "页面会自动刷新，先别关——马上出结果。",
  "stage.progressAriaLabel": "分析进度",
  "livebuild.fingerprintTitle": "看穿你的项目",
  "livebuild.searchTitle": "全网揪同类",
  "livebuild.verifyTitle": "逐个深度核对",
  "livebuild.judgeTitle": "落下裁决",
  "livebuild.noCandidates": "本轮没召回到候选",
  "livebuild.moreCandidates": "+{n} 个候选",
  "livebuild.verifyNote": "深读 {total} 个 · 直接竞品 {direct} 个",

  // ===== 指纹确认 FingerprintEditor =====
  "fpEditor.kicker": "// 成本闸门 · 请先过目",
  "fpEditor.title": "确认项目指纹",
  "fpEditor.desc":
    "下面这份「项目指纹」是我们从你的网站 / 仓库里提炼的。核对并按需修改——确认后才会去跑昂贵的相似项目搜索与重复度裁判。",
  "fpEditor.conflicts": "// 冲突点",
  "fpEditor.unknowns": "// 未知项",
  "fpEditor.confirmErr": "确认失败，请重试。",
  "fpEditor.submitting": "提交中…",
  "fpEditor.submit": "确认并继续调查",

  // ===== 指纹字段（编辑器 + 报告页展示共用）=====
  "field.oneLiner": "一句话简介",
  "field.targetUsers": "目标用户",
  "field.problem": "解决的问题",
  "field.functionalSignature": "功能签名",
  "field.functionalSignatureHint": "functional signature · 驱动相似项目搜索",
  "field.ioInput": "输入",
  "field.ioProcessing": "处理",
  "field.ioOutput": "输出",
  "field.businessModel": "商业模式",
  "field.coreFeatures": "核心功能",
  "field.claimedNovelty": "宣称的创新点",
  "hint.perLine": "每行一条",

  // ===== 通用等级/严重度/来源/关系（后端枚举值的展示标签）=====
  "level.high": "高",
  "level.medium": "中",
  "level.low": "低",
  "severity.critical": "致命",
  "severity.major": "重要",
  "severity.minor": "次要",
  "severity.info": "提示",
  "severity.strength": "优点",
  "source.website": "网站",
  "source.github_readme": "README",
  "source.github_code": "代码",
  "source.github_config": "配置",
  "source.github_meta": "仓库信息",
  "source.search_result": "检索",
  "source.author_claim": "作者声明",
  "source.metric": "指标",
  "relation.direct_competitor": "直接竞品",
  "relation.alternative": "替代方案",
  "relation.adjacent": "相邻",
  "relation.abandoned": "已停更",
  "relation.superficial": "表面相似",
  "relation.fallback": "相关",
  "dim.same_problem": "同一问题",
  "dim.same_users": "同一用户",
  "dim.same_io_flow": "输入输出/工作流",
  "dim.feature_overlap": "功能重合",
  "dim.same_mechanism": "核心机制",
  "dim.unique_proven": "独有且已证明",

  // ===== 物证卡 FindingCard =====
  "finding.confidencePrefix": "置信 {level}",
  "finding.expand": "点开物证 ▸",
  "finding.collapse": "收起物证 ▾",
  "finding.evidencePrefix": "物证 · {source}",
  "finding.confSuffix": " · 置信 {level}",
  "finding.noEvidence": "（暂无可点开的物证）",

  // ===== 报告页 ReportView =====
  "metric.dupProb": "重复造轮子概率",
  "metric.confidence": "置信度 · {level}",
  "tone.tip": "同一份事实，三副嘴脸 →",
  "tone.ariaLabel": "语气",
  "tone.serious": "认真",
  "tone.roast": "毒舌",
  "tone.comfort": "安慰",
  "candidate.lastActivePrefix": "最近",
  "candidate.whyPrefix": "为何相关 ·",
  "candidate.unknown": "未知项目",
  "improvement.learnFromPrefix": "可借鉴 ·",
  "improvement.impactPrefix": "影响",
  "improvement.costPrefix": "成本",
  "fp.blockTitle": "项目指纹",
  "fp.eyebrow": "我们理解的你 · 把握 {level}",
  "ledger.title": "新意 · 存疑 · 未知",
  "ledger.eyebrow": "缺证据就降置信，不硬编",
  "ledger.trueNovelty": "真正的新意",
  "ledger.claimVsFact": "声称 vs 事实",
  "ledger.unknownCol": "尚未确定",
  "ledger.emptyNovelty": "未发现明确差异化",
  "ledger.emptyConflict": "无明显冲突",
  "ledger.emptyUnknown": "关键信息基本齐全",
  "ledger.provenTag": "已证实",
  "fold.toggle": "展开 / 收起",
  "verdictStamp.repeat": "疑似重复",
  "verdictStamp.repeatRoast": "又一个轮子",
  "verdictStamp.warn": "似曾相识",
  "verdictStamp.warnRoast": "撞车预警",
  "verdictStamp.ok": "有点东西",
  "verdictStamp.okRoast": "居然有点东西",
  "report.notFound": "报告数据缺失。",
  "hero.caseLine": "// 卷宗 {caseNo} ·",
  "hero.share": "📸 生成战报 · 分享",
  "hero.linkCopied": "✓ 已复制",
  "hero.copyLink": "🔗 复制报告链接",
  "summary.eyebrowRoast": "// 一句话，别绕弯",
  "summary.eyebrowComfort": "// 抱抱你 · 纯情绪价值",
  "summary.eyebrowSerious": "// 一句话总结",
  "summary.dupLabel": "重复度 {pct}%",
  "summary.doKeyRoast": "先补最露怯的一处",
  "summary.doKeyComfort": "顺手加一点点就更棒",
  "summary.doKeySerious": "想让我投，先做这个",
  "summary.whyPrefixRoast": "凭啥这么说 ·",
  "summary.whyPrefixComfort": "为什么你值得被夸 ·",
  "summary.whyPrefixSerious": "评级依据 ·",
  "summary.comfort":
    "🌈 别管那些数字啦——你能把想法真做出来，这份勇气就已经赢过一大半人了，超棒的！",
  "summary.highRoast": "别自欺了——这基本就是个轮子，市面上一抓一大把。",
  "summary.highSerious": "评级：Pass。同一盘菜的第 N 次加热，这个 valuation 我笑而不语。",
  "summary.midRoast": "似曾相识——你是有点东西，但撞车的地方也真不少。",
  "summary.midSerious": "评级：观望。有点意思，可护城河呢？call me when you have traction。",
  "summary.lowRoast": "行，居然有点东西——守住这点不一样，别浪费了。",
  "summary.lowSerious": "评级：可以聊。至少不是又一个轮子——但想让我投，还差得远。",
  "signal.headNote": "值不值得继续，光看「像不像」不够，也看竞品有多能打",
  "signal.crowdedTag": "赛道成熟 · 拥挤",
  "signal.crowdedText":
    "已有多个直接竞品，最高 {stars}★ 且还在更新——硬刚很难，值得做的前提是找到真差异化或够窄的细分。",
  "signal.staleTag": "竞品大多停更",
  "signal.staleText":
    "搜到的同类大多很久没动静了——可能有空位，但先想清楚「为什么没人接着做」。",
  "signal.openTag": "赛道还没挤",
  "signal.openText": "本轮没撞到高热度的直接竞品——有机会，但先去验证是真需求还是伪需求。",
  "signal.defaultTag": "赛道信号",
  "signal.defaultText":
    "直接竞品 {direct} 个，最高 {stars}★——不算空白，也没被锁死，差异化做对了有戏。",
  "folds.hint": "想看论证细节？逐条展开 ↓",
  "fold.roastFull": "毒舌全文",
  "fold.reviewFull": "评审全文",
  "fold.completeReview": "完整点评",
  "fold.improvements": "改进优先级",
  "fold.improvementsHint": "按 影响 × 成本",
  "fold.dupBreakdown": "重复度拆解",
  "fold.dupBreakdownHint": "0 独一份 · 1 完全重合",
  "fold.fingerprintHint": "我们理解的你",
  "fold.ledgerHint": "缺证据就降置信",
  "fold.findings": "问题与优点 · 物证",
  "fold.findingsHint": "每条可点开证据",
  "fold.candidates": "对照物 · 召回竞品",
  "fold.candidatesHint": "{n} 个",
  "cost.calls": "{n} 次调用",
  "cost.searches": "{n} 次检索",
  "cost.sourcesPrefix": "数据源 ·",
  "cost.sourceWebsite": "网站",
  "cost.sourceRepo": "仓库",
  "cost.degradations": "降级 {n} 项",
  "brand.tagline": "证据化项目锐评",
  "footer.mission": "刻薄可以主观，事实不能主观；锐评项目，不攻击开发者本人。",

  // ===== 分享战报 ShareCard =====
  "share.tagRoast": "🤡 当众处刑",
  "share.tagComfort": "🌈 无条件捧场",
  "share.tagSerious": "💰 郑重估值",
  "share.generating": "生成中…",
  "share.download": "⬇ 下载战报图",
  "share.linkCopied": "✓ 链接已复制",
  "share.copyLink": "🔗 复制公开链接",
  "share.close": "关闭",
} as const;

export type DictKey = keyof typeof zh;

const en: Record<DictKey, string> = {
  "topbar.tagline": "// Evidence-Based Project Roast",
  "topbar.navAriaLabel": "Open-source project nav",
  "topbar.demo": "Demo",
  "topbar.deploy": "Deploy",
  "topbar.github": "GitHub ↗",
  "topbar.restartTitle": "Back to the intro from the start",
  "topbar.restart": "↻ Restart",
  "topbar.personaSwitchTitle": "Switch to “{name}”",
  "topbar.personaSwap": "Swap {emoji}",
  "topbar.langSwitchAria": "Switch interface language",

  "access.checkingSub": "Checking public-demo access status…",
  "access.lockedSub": "The deployer enabled access protection · enter the access code",
  "access.codeLabel": "Access code",
  "access.codePlaceholder": "Access code",
  "access.err": "Wrong code — please check and try again.",
  "access.verifying": "Verifying…",
  "access.enter": "Enter →",

  "home.loading": "Opening the case file…",
  "home.back": "← Pick another judge",
  "home.flowAriaLabel": "Analysis flow",
  "home.flow.fingerprint": "Extract fingerprint",
  "home.flow.search": "Search look-alikes",
  "home.flow.verify": "Verify evidence",
  "home.flow.judge": "Judge duplication",

  "demo.compactLabel": "Preview a finished report:",
  "demo.fullLabel": "Pre-run sample reports · instant, no API key used:",
  "demo.dupLabel": "Dup",

  "form.examplesLabel": "No project handy? Try a public example:",
  "form.clueLabel": "Drop in your project",
  "form.cluePlaceholder":
    "URL / GitHub / one-line description (e.g. a mini app that tracks pet vaccine schedules)",
  "form.clueHint": "One clue is enough — a public URL is most accurate, but a raw idea works too.",
  "form.moreShow": "＋ Add more clues (optional, sharper results)",
  "form.moreHide": "－ Hide extra clues",
  "form.githubLabel": "GitHub repo (optional)",
  "form.targetUsersLabel": "Who's it for?",
  "form.targetUsersPlaceholder": "e.g. PMs who need fast meeting-note summaries",
  "form.problemLabel": "What problem does it solve?",
  "form.problemPlaceholder": "e.g. turns messy voice notes into structured minutes",
  "form.noveltyLabel": "What's your claimed novelty?",
  "form.noveltyPlaceholder": "e.g. on-device inference + speaker diarization, privacy stays local",
  "form.confirmFpLabel": "Let me confirm the fingerprint before searching (saves tokens, more accurate)",
  "form.privacyBold": "Before you submit:",
  "form.privacyRest":
    "mock mode uses no key; live mode spends the deployer's quota. Don't submit private repos, internal addresses, or sensitive business data.",
  "form.errNoClue": "One clue is enough: paste a URL, a GitHub link, or describe your project in a sentence.",
  "form.errSubmitFail": "Submission failed, please try again later.",
  "form.submitting": "Under review…",
  "form.judgeLabel": "Judge:",
  "form.judgeSwitchHint": "· switch anytime from the top bar",

  "report.backHome": "← Back, try another project",
  "report.recheckTooltip": "Re-run the same target to compare before/after",
  "report.rechecking": "Re-checking…",
  "report.recheck": "↻ Re-check",
  "report.recheckFailed": "Re-check failed",
  "report.caseLabel": "Case {jobId}",
  "report.expiredKicker": "// Case file lost",
  "report.expiredTitle": "This analysis has expired or doesn't exist",
  "report.expiredBody":
    "The job may have been cleaned up, the link expired, or the service just restarted and lost its progress — just resubmit.",
  "report.resubmitting": "Resubmitting…",
  "report.reanalyze": "Re-analyze this project",
  "report.backHomeRestart": "Back to home and start over",
  "report.errorTitle": "Something went wrong",
  "report.reconnect": "Reconnect",
  "report.backHomeLink": "Back home",
  "report.investigatingKicker": "// Investigating…",
  "report.fetchingCase": "Retrieving the case file…",
  "report.abortedKicker": "// Investigation aborted",
  "report.analysisFailedTitle": "Analysis failed",
  "report.unknownError": "Unknown error.",
  "report.connIssue": "Connection issue: {message} (retrying…)",
  "report.subjectFallback": "this project",

  "api.connError": "Can't reach the analysis service right now. Make sure the backend is running, or try again later.",
  "api.accessExpired": "The access code is invalid or expired. Please refresh the page and verify again.",
  "api.notFound": "Couldn't find this job or report; it may have expired, or the service just restarted.",
  "api.tooManyRequests": "Too many requests, please try again later.",
  "api.serviceUnavailable": "The analysis service is temporarily unavailable, please try again later.",
  "api.requestFailed": "Request failed ({status})",

  "stage.site_analysis": "Analyzing website",
  "stage.github_analysis": "Analyzing repo",
  "stage.fingerprint": "Synthesizing fingerprint",
  "stage.search": "Searching similar projects",
  "stage.verify": "Verifying candidates",
  "stage.judge": "Judging duplication",
  "stage.factlayer": "Aggregating facts",
  "stage.render": "Rendering report",
  "stage.done": "Done",
  "stage.queued": "Queued",
  "stage.processingFallback": "Processing",
  "stage.waitKickerRoast": "// Roasting in progress…",
  "stage.waitKickerComfort": "// The cheer squad is assembling…",
  "stage.waitKickerSerious": "// The committee is evaluating…",
  "stage.caption": "This page auto-refreshes — keep it open, results are almost ready.",
  "stage.progressAriaLabel": "Analysis progress",
  "livebuild.fingerprintTitle": "Reading through your project",
  "livebuild.searchTitle": "Scouring the web for look-alikes",
  "livebuild.verifyTitle": "Deep-checking each one",
  "livebuild.judgeTitle": "Handing down the verdict",
  "livebuild.noCandidates": "No candidates surfaced this round",
  "livebuild.moreCandidates": "+{n} more",
  "livebuild.verifyNote": "Reviewed {total} · {direct} direct competitor(s)",

  "fpEditor.kicker": "// Cost gate · please review first",
  "fpEditor.title": "Confirm the project fingerprint",
  "fpEditor.desc":
    "This \"fingerprint\" is distilled from your website / repo. Review and edit as needed — confirming triggers the pricier similar-project search and duplication verdict.",
  "fpEditor.conflicts": "// Conflicts",
  "fpEditor.unknowns": "// Unknowns",
  "fpEditor.confirmErr": "Confirmation failed, please try again.",
  "fpEditor.submitting": "Submitting…",
  "fpEditor.submit": "Confirm and continue the investigation",

  "field.oneLiner": "One-line summary",
  "field.targetUsers": "Target users",
  "field.problem": "Problem solved",
  "field.functionalSignature": "Functional signature",
  "field.functionalSignatureHint": "functional signature · drives the similar-project search",
  "field.ioInput": "Input",
  "field.ioProcessing": "Processing",
  "field.ioOutput": "Output",
  "field.businessModel": "Business model",
  "field.coreFeatures": "Core features",
  "field.claimedNovelty": "Claimed novelty",
  "hint.perLine": "one per line",

  "level.high": "High",
  "level.medium": "Medium",
  "level.low": "Low",
  "severity.critical": "Critical",
  "severity.major": "Major",
  "severity.minor": "Minor",
  "severity.info": "Info",
  "severity.strength": "Strength",
  "source.website": "Website",
  "source.github_readme": "README",
  "source.github_code": "Code",
  "source.github_config": "Config",
  "source.github_meta": "Repo info",
  "source.search_result": "Search",
  "source.author_claim": "Author claim",
  "source.metric": "Metric",
  "relation.direct_competitor": "Direct competitor",
  "relation.alternative": "Alternative",
  "relation.adjacent": "Adjacent",
  "relation.abandoned": "Abandoned",
  "relation.superficial": "Superficial",
  "relation.fallback": "Related",
  "dim.same_problem": "Same problem",
  "dim.same_users": "Same users",
  "dim.same_io_flow": "I/O & workflow",
  "dim.feature_overlap": "Feature overlap",
  "dim.same_mechanism": "Core mechanism",
  "dim.unique_proven": "Unique & proven",

  "finding.confidencePrefix": "Confidence {level}",
  "finding.expand": "Show evidence ▸",
  "finding.collapse": "Hide evidence ▾",
  "finding.evidencePrefix": "Evidence · {source}",
  "finding.confSuffix": " · confidence {level}",
  "finding.noEvidence": "(no evidence to expand)",

  "metric.dupProb": "Reinvented-wheel probability",
  "metric.confidence": "Confidence · {level}",
  "tone.tip": "Same facts, three faces →",
  "tone.ariaLabel": "Tone",
  "tone.serious": "Serious",
  "tone.roast": "Roast",
  "tone.comfort": "Comfort",
  "candidate.lastActivePrefix": "last active",
  "candidate.whyPrefix": "Why it's relevant ·",
  "candidate.unknown": "Unknown project",
  "improvement.learnFromPrefix": "Worth learning from ·",
  "improvement.impactPrefix": "Impact",
  "improvement.costPrefix": "Cost",
  "fp.blockTitle": "Project fingerprint",
  "fp.eyebrow": "How we read you · confidence {level}",
  "ledger.title": "Novelty · Doubts · Unknowns",
  "ledger.eyebrow": "No evidence, lower confidence — no making things up",
  "ledger.trueNovelty": "Genuine novelty",
  "ledger.claimVsFact": "Claim vs. fact",
  "ledger.unknownCol": "Still unknown",
  "ledger.emptyNovelty": "No clear differentiator found",
  "ledger.emptyConflict": "No obvious conflicts",
  "ledger.emptyUnknown": "Key info is largely complete",
  "ledger.provenTag": "Verified",
  "fold.toggle": "Expand / collapse",
  "verdictStamp.repeat": "Looks like a duplicate",
  "verdictStamp.repeatRoast": "Another reinvented wheel",
  "verdictStamp.warn": "Déjà vu",
  "verdictStamp.warnRoast": "Collision warning",
  "verdictStamp.ok": "There's something here",
  "verdictStamp.okRoast": "Huh, actually something here",
  "report.notFound": "Report data is missing.",
  "hero.caseLine": "// Case {caseNo} ·",
  "hero.share": "📸 Generate share card",
  "hero.linkCopied": "✓ Copied",
  "hero.copyLink": "🔗 Copy report link",
  "summary.eyebrowRoast": "// One line, no fluff",
  "summary.eyebrowComfort": "// Hugs for you · pure emotional support",
  "summary.eyebrowSerious": "// One-line summary",
  "summary.dupLabel": "Duplication {pct}%",
  "summary.doKeyRoast": "Patch your weakest spot first",
  "summary.doKeyComfort": "One small addition makes it even better",
  "summary.doKeySerious": "Want my investment? Do this first",
  "summary.whyPrefixRoast": "Why we say so ·",
  "summary.whyPrefixComfort": "Why you deserve the praise ·",
  "summary.whyPrefixSerious": "Rating rationale ·",
  "summary.comfort":
    "🌈 Forget the numbers for a second — actually shipping the idea already puts you ahead of most people. That's amazing.",
  "summary.highRoast": "Don't kid yourself — this is basically a wheel, and the market's full of them.",
  "summary.highSerious":
    "Rating: Pass. The same dish reheated for the Nth time — I'll let this valuation speak for itself.",
  "summary.midRoast": "Déjà vu — you've got something, but there's real overlap too.",
  "summary.midSerious":
    "Rating: Watch. Somewhat interesting, but where's the moat? Call me when you have traction.",
  "summary.lowRoast": "Fine, there's actually something here — hold onto that edge, don't waste it.",
  "summary.lowSerious":
    "Rating: Worth a conversation. At least it's not another wheel — but far from investable yet.",
  "signal.headNote":
    "Whether it's worth pursuing isn't just about looking alike — it's also about how strong the competition is",
  "signal.crowdedTag": "Mature & crowded space",
  "signal.crowdedText":
    "Multiple direct competitors already exist, the top one at {stars}★ and still shipping — going head-on is tough; only worth it with real differentiation or a narrow enough niche.",
  "signal.staleTag": "Most competitors have stalled",
  "signal.staleText":
    "Most similar projects found have gone quiet — there may be an opening, but first figure out why no one kept going.",
  "signal.openTag": "Space isn't crowded yet",
  "signal.openText":
    "No high-heat direct competitor showed up this round — there's a chance, but validate whether the need is real first.",
  "signal.defaultTag": "Track signal",
  "signal.defaultText":
    "{direct} direct competitor(s), top at {stars}★ — not empty, but not locked down either; nail the differentiation and you have a shot.",
  "folds.hint": "Want the reasoning behind it? Expand each section ↓",
  "fold.roastFull": "Full roast",
  "fold.reviewFull": "Full review",
  "fold.completeReview": "Full commentary",
  "fold.improvements": "Improvement priorities",
  "fold.improvementsHint": "By impact × cost",
  "fold.dupBreakdown": "Duplication breakdown",
  "fold.dupBreakdownHint": "0 = one-of-a-kind · 1 = fully overlapping",
  "fold.fingerprintHint": "How we read you",
  "fold.ledgerHint": "No evidence, lower confidence",
  "fold.findings": "Issues & strengths · evidence",
  "fold.findingsHint": "Expand each for evidence",
  "fold.candidates": "Comparables · recalled competitors",
  "fold.candidatesHint": "{n} found",
  "cost.calls": "{n} calls",
  "cost.searches": "{n} searches",
  "cost.sourcesPrefix": "Sources ·",
  "cost.sourceWebsite": "website",
  "cost.sourceRepo": "repo",
  "cost.degradations": "{n} degraded step(s)",
  "brand.tagline": "Evidence-Based Project Roast",
  "footer.mission":
    "Snark can be subjective, facts can't; we roast the project, never the person behind it.",

  "share.tagRoast": "🤡 Public execution",
  "share.tagComfort": "🌈 Unconditional support",
  "share.tagSerious": "💰 Formal valuation",
  "share.generating": "Generating…",
  "share.download": "⬇ Download share card",
  "share.linkCopied": "✓ Link copied",
  "share.copyLink": "🔗 Copy public link",
  "share.close": "Close",
};

const DICTS: Record<Lang, Record<DictKey, string>> = { zh, en };

export type TFunc = (key: DictKey, vars?: Record<string, string | number>) => string;

function interpolate(s: string, vars?: Record<string, string | number>): string {
  if (!vars) return s;
  let out = s;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
  }
  return out;
}

/** 同步读取当前语言，供非组件代码（如 lib/api.ts）使用，不依赖 hook。 */
export function getLang(): Lang {
  if (typeof window === "undefined") return "zh";
  const saved = window.localStorage.getItem(KEY);
  return saved === "en" ? "en" : "zh";
}

/** 同步取词，供非组件代码（如 lib/api.ts 的错误文案）使用，不依赖 hook。 */
export function tSync(key: DictKey, vars?: Record<string, string | number>): string {
  return translate(getLang(), key, vars);
}

type LangCtx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: TFunc;
};

function translate(lang: Lang, key: DictKey, vars?: Record<string, string | number>): string {
  const dict = DICTS[lang];
  return interpolate(dict[key] ?? zh[key] ?? key, vars);
}

const Ctx = createContext<LangCtx>({
  lang: "zh",
  setLang: () => {},
  t: (key, vars) => translate("zh", key, vars),
});

export function LangProvider({ children }: { children: ReactNode }) {
  // 首帧按 'zh' 走(与静态 SSR 输出一致，避免闪烁)；挂载后从 localStorage 恢复。
  const [lang, setLangState] = useState<Lang>("zh");

  // 仅在挂载时读一次 localStorage 恢复状态；不在这里写回 storage —— 否则首帧默认值 'zh'
  // 会在恢复生效前抢先落盘，把已保存的语言覆盖掉（初始 state 与恢复值之间的竞态）。
  useEffect(() => {
    const saved = getLang();
    setLangState(saved);
    document.documentElement.lang = saved === "en" ? "en" : "zh-CN";
  }, []);

  // 写 storage 只由用户主动切换触发，读/写职责分离，避免上面的竞态。
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    window.localStorage.setItem(KEY, l);
    document.documentElement.lang = l === "en" ? "en" : "zh-CN";
  }, []);
  const t = useCallback<TFunc>((key, vars) => translate(lang, key, vars), [lang]);

  // .ts 文件不解析 JSX，这里用 createElement 代替 <Ctx.Provider>。
  return createElement(Ctx.Provider, { value: { lang, setLang, t } }, children);
}

export function useLang() {
  return useContext(Ctx);
}
