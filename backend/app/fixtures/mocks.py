"""Mock 数据 —— 让整条流水线零成本跑通, 并作为一份"活的"契约样例。

样例(有点自我指涉): 被分析的项目本身是一个"输入网址→AI 毒舌点评"的工具,
流水线召回的竞品正是调研里的真实产品 (Roast My Web / BigDevSoon / GitBox / WTF...),
最终裁判给出"这条赛道很拥挤"的结论 —— 正好复现调研的判断。

每个 key 对应一个 LLM 调用点 (task)。MockProvider 会按调用方给的 schema 校验这里的 dict,
所以补样例时字段要和 app/models/schemas.py 对齐。
"""
from __future__ import annotations

# ─────────── search 召回的候选池 (MockSearchClient 用) ───────────
MOCK_CANDIDATES: list[dict] = [
    {
        "name": "Roast My Web",
        "url": "https://roastmyweb.example",
        "source": "web",
        "snippet": "AI 毒舌反馈网站的设计 / UX / CRO / SEO",
        "why_surfaced": "同任务: AI 网站锐评",
    },
    {
        "name": "BigDevSoon — Roast My Project",
        "url": "https://bigdevsoon.example/roast",
        "source": "web",
        "snippet": "从设计 / 文案 / 价值主张 / 性能等 8 类评分并锐评",
        "why_surfaced": "同输入输出: 提交项目 → 评分 + 锐评",
    },
    {
        "name": "GitBox",
        "url": "https://github.com/example/gitbox",
        "source": "github",
        "snippet": "分析 GitHub 用户 / 项目活动生成 AI 锐评, 支持图片报告, ~460 stars",
        "why_surfaced": "同机制: 抓取 + LLM 生成锐评 + 分享图",
    },
    {
        "name": "WTF Does This Company Actually Do",
        "url": "https://github.com/example/wtf-company",
        "source": "github",
        "snippet": "输入 URL → 抓取 → 搜索评论/融资/竞品 → 语音锐评",
        "why_surfaced": "最接近: 网站 + 外部证据化锐评",
    },
    {
        "name": "RoastMyWork",
        "url": "https://roastmywork.example",
        "source": "web",
        "snippet": "网站 / App / 简历投稿, 真人点评 + 声誉 + 排行榜",
        "why_surfaced": "替代方案: 真人锐评社区 vs AI",
    },
]

# ─────────────────────── 每个 LLM 调用点的 canned 结果 ───────────────────────
MOCK_LLM: dict[str, dict] = {
    # site_analyzer
    "extract_site": {
        "url": "https://roastmysite.example",
        "reachable": True,
        "requires_login": False,
        "title": "RoastMySite — 输入网址, 立刻被 AI 喷醒",
        "description": "把你的网站丢进来, AI 给出犀利点评和评分, 一键生成分享海报。",
        "target_users": "独立开发者 / 产品新人",
        "core_promise": "几十秒拿到犀利反馈与评分",
        "inputs": "公开网站 URL",
        "outputs": "评分 + 毒舌点评文案 + 分享海报",
        "feature_list": ["抓取首页", "生成锐评", "0-100 评分", "分享海报"],
        "use_flow": ["粘贴网址", "点击 Roast", "查看评分与点评", "下载海报"],
        "pricing": "免费, 高级版 $9/月",
        "business_model": "freemium",
        "key_pages": [
            {"type": "home", "url": "https://roastmysite.example", "title": "首页"},
            {"type": "pricing", "url": "https://roastmysite.example/pricing", "title": "定价"},
        ],
        "evidence": [
            {"source_type": "website", "locator": "https://roastmysite.example (首页 hero)",
             "quote": "输入网址, 立刻被 AI 喷醒", "confidence": "high"},
        ],
        "missing_info": ["无客观性能指标 (Lighthouse)", "未说明抓取深度"],
        "confidence": "medium",
    },
    # github_analyzer
    "extract_repo": {
        "url": "https://github.com/example/roastmysite",
        "reachable": True,
        "description": "RoastMySite 后端 —— 抓取 + LLM 生成锐评",
        "topics": ["ai", "roast", "website"],
        "primary_language": "TypeScript",
        "languages": ["TypeScript", "CSS"],
        "readme_summary": "Next.js 应用, 调用 OpenAI 对首页文案与 meta 生成锐评。",
        "dependencies": ["next", "openai", "cheerio"],
        "config_files": ["package.json", "next.config.js"],
        "key_modules": [
            {"path": "app/api/roast/route.ts", "role": "接收 URL, 抓首页, 调 LLM 生成锐评"},
            {"path": "lib/scrape.ts", "role": "cheerio 抓取 title/meta/正文"},
        ],
        "entrypoints": ["app/api/roast/route.ts"],
        "api_routes": ["POST /api/roast"],
        "activity": {"stars": 34, "commit_frequency": "moderate", "recent_release": "v0.2"},
        "license": "MIT",
        "evidence": [
            {"source_type": "github_code", "locator": "lib/scrape.ts:12-40",
             "quote": "只抓 title/meta/首屏正文", "confidence": "high",
             "note": "证据: 抓取深度确实只到首页"},
        ],
        "missing_info": ["无测试", "未见竞品/创新性分析逻辑"],
        "confidence": "high",
    },
    # fingerprint
    "synthesize_fingerprint": {
        "one_liner": "输入网址, AI 生成毒舌点评和评分的工具",
        "target_users": "独立开发者 / 产品新人",
        "problem": "想快速知道自己网站哪里不好, 但找人评价慢、拿不到犀利反馈",
        "io": {"input": "公开网站 URL", "processing": "抓首页 + LLM 生成锐评/评分",
               "output": "评分 + 毒舌文案 + 分享海报"},
        "core_features": ["抓取首页", "生成锐评", "评分", "分享海报"],
        "business_model": "freemium",
        "claimed_novelty": ["更犀利、更好笑的锐评文案"],
        "observed_differentiators": [
            {"description": "仅停留在网页文案层, 未做竞品对比 / 创新性判断",
             "proven": True,
             "evidence": [{"source_type": "github_code", "locator": "lib/scrape.ts:12-40",
                           "quote": "只抓 title/meta/首屏", "confidence": "high"}]},
        ],
        "functional_signature": "为独立开发者, 在自查场景, 输入网站 URL, 通过抓首页+LLM生成, 产出评分与毒舌点评",
        "conflicts": ["首页宣称'深度分析', 但代码只读首页 meta 与文案"],
        "unknowns": ["是否有留存机制"],
        "evidence": [
            {"source_type": "author_claim", "locator": "作者填写: 最不同 = 更犀利文案",
             "quote": "更犀利、更好笑", "confidence": "medium"},
        ],
        "confidence": "medium",
    },
    # search: 生成的多组 query
    "generate_queries": {
        "queries": [
            "AI website roast tool",
            "AI 网站锐评 生成器",
            "roast my project AI feedback",
            "AI 项目点评 GitHub 开源",
            "website feedback AI scoring share card",
            "毒舌 网站 点评 工具 独立开发者",
        ]
    },
    # verify: 对单个候选的评估 (mock 静态返回, 真实实现应逐个深读)
    "verify_candidate": {
        "relation": "direct_competitor",
        "notes": "同为 AI 锐评类工具; 具体关系应逐个深读判定 (此为 mock 静态返回)",
        "confidence": "medium",
        "fingerprint": None,
    },
    # judge: 重复度裁判
    "judge_duplication": {
        "duplication_score": 0.72,
        "confidence": "medium",
        "dimensions": {
            "same_problem": 0.9, "same_users": 0.85, "same_io_flow": 0.8,
            "feature_overlap": 0.75, "same_mechanism": 0.8, "unique_proven": 0.15,
        },
        "novelty": [
            {"type": "unproven", "description": "'更犀利文案' 不构成壁垒, 竞品同样能做到",
             "evidence": [{"source_type": "search_result",
                           "locator": "GitHub 搜索 'AI website roast' ~69 repos",
                           "quote": "大量同类仓库, 关注度普遍很低", "confidence": "high"}]},
        ],
        "top_similar": ["Roast My Web", "GitBox", "BigDevSoon — Roast My Project"],
        "rationale": "'输入网址→AI 毒舌点评' 已非常拥挤, 技术门槛低, 单纯让模型更刻薄几乎没有壁垒。",
        "search_scope_note": "本次检索覆盖 GitHub / Product Hunt / 中文社区, 截至 2026-08-05, 未穷尽; 只能说本范围内高度相似产品已多。",
        "evidence": [
            {"source_type": "search_result", "locator": "GitHub search 'AI website roast'",
             "quote": "~69 repos, 多数 star 很低", "confidence": "high"},
        ],
    },
    # factlayer: 统一事实层 (优点 / 问题 / 改进)
    "synthesize_factlayer": {
        "strengths": [
            {"id": "s1", "category": "execution", "title": "落地快、传播性强", "severity": "strength",
             "detail": "抓首页+LLM+海报的组合开发成本低, 天然适合社交传播。",
             "confidence": "high",
             "evidence": [{"source_type": "website", "locator": "首页 + /pricing",
                           "quote": "一键生成分享海报", "confidence": "high"}]},
        ],
        "issues": [
            {"id": "i1", "category": "novelty", "title": "核心创新点无法证明", "severity": "major",
             "detail": "作者声称的'更犀利文案'不构成壁垒, 同类工具遍地都是。",
             "confidence": "high",
             "evidence": [{"source_type": "search_result",
                           "locator": "GitHub 'AI website roast' ~69 repos",
                           "quote": "同类仓库大量存在", "confidence": "high"}]},
            {"id": "i2", "category": "positioning", "title": "只停留在网页质量层", "severity": "major",
             "detail": "未触及项目本身的创新性 / 重复度, 与'认真验证'型产品不在一个层次。",
             "confidence": "high",
             "evidence": [{"source_type": "github_code", "locator": "lib/scrape.ts:12-40",
                           "quote": "只抓首页 meta 与文案", "confidence": "high"}]},
            {"id": "i3", "category": "risk", "title": "一次性工具, 留存差", "severity": "minor",
             "detail": "用户大概率玩一次就走, 缺少复用理由。",
             "confidence": "medium", "evidence": []},
        ],
        "improvements": [
            {"id": "m1", "title": "加入'网站 + GitHub 双源交叉验证'",
             "rationale": "这是竞品普遍缺失的组合, 也是从'网页点评'升级到'项目鉴定'的关键。",
             "impact": "high", "cost": "high", "learn_from": ["WTF Does This Company Actually Do"]},
            {"id": "m2", "title": "每条批评都能点开证据",
             "rationale": "从'凭感觉喷'升级为'可核验', 建立信任与壁垒。",
             "impact": "high", "cost": "medium", "learn_from": []},
            {"id": "m3", "title": "记录项目版本, 改版后重新检测",
             "rationale": "带来复用理由, 改善留存。",
             "impact": "medium", "cost": "medium", "learn_from": []},
        ],
    },
    # report: 认真版 (findings 会被 report 模块用统一事实层覆盖, 保证不新增未证实结论)
    "render_serious": {
        "tone": "serious",
        "headline": "认真版:执行不错, 但护城河薄弱的锐评工具",
        "body_markdown": (
            "## 结论\n"
            "这是一个**执行完成度不错、传播性强**的 AI 锐评工具, 但核心创新点(更犀利的文案)"
            "无法构成壁垒 —— 本次检索范围内已有大量高度相似产品。\n\n"
            "## 竞品借鉴\n"
            "- **WTF Does This Company Actually Do**:值得学习其'网站 + 外部证据'的组合。\n"
            "- **GitBox**:分享图 / 传播玩法成熟。\n\n"
            "## 改进优先级 (按影响/成本)\n"
            "1. 网站 + GitHub 双源交叉验证 (影响高)\n"
            "2. 每条批评可点开证据 (影响高、成本中)\n"
            "3. 记录版本、改版重检 (改善留存)\n"
        ),
        "findings": [],
    },
    # report: 毒舌版 (基于同一事实, 只换语气, 不新增攻击)
    "render_roast": {
        "tone": "roast",
        "headline": "毒舌版:又一个'输入网址喷一喷'的周末项目",
        "body_markdown": (
            "## 锐评\n"
            "恭喜, 你成功复刻了 GitHub 上第 70 个 'AI website roast'。\n\n"
            "- **创新点?** '更犀利的文案' —— 这不是护城河, 这是 prompt 里的一句形容词。\n"
            "- **深度?** 代码只读了首页的 title 和 meta, 就敢在首页写'深度分析'。\n"
            "- **留存?** 用户喷完自己截个图就走了, 你连他叫什么都不知道。\n\n"
            "> 刻薄归刻薄, 事实是事实:上面每一句都能点开证据。想不被喷成第 70 个, "
            "先把'网站 + GitHub 双源验证'和'可核验证据'做出来。\n"
        ),
        "findings": [],
    },
}
