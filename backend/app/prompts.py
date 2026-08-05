"""集中管理所有 system prompt 与 prompt 构造。

prompt 工程(E1-2 / E3-1 / E6-1 / E7-2 / E7-3 ...)全改这里, 模块只调用这里的构造函数。
每个函数返回 (system, user_prompt)。
"""
from __future__ import annotations

from app.models.schemas import (
    AuthorStatement, CrawlResult, DuplicationVerdict, ProjectFingerprint, RepoMapResult,
    RepoFacts, SiteFacts, ToneMode, VerifiedCandidate,
)

# ─────────────────────────── 事实提取 ───────────────────────────
SITE_SYSTEM = (
    "你是网站事实提取器。只输出能被页面证据支撑的事实; 拿不准或页面没有的, 留空并写进 missing_info。"
    " 区分'营销文案宣称'与'实际功能'。不要臆造。"
)


def site_extract(url: str, statement: AuthorStatement, crawl: CrawlResult) -> tuple[str, str]:
    user = (
        f"网站 URL: {url}\n"
        f"作者声明(参考, 需与页面证据交叉验证): {statement.model_dump()}\n"
        f"抓取内容(markdown):\n{crawl.markdown}\n\n"
        "请提取: 目标用户 / 核心承诺 / 输入输出 / 功能列表 / 使用流程 / 定价 / 商业模式, "
        "并给出证据(evidence)与缺失项(missing_info); 若需登录才能理解, 置 requires_login=true 并降低 confidence。"
    )
    return SITE_SYSTEM, user


REPO_SYSTEM = (
    "你是代码仓库事实提取器。基于 repo map 与关键文件, 提取真实实现(不是 README 吹的)。"
    " 关注: 入口 / API / 数据模型 / 关键机制 / 活跃度。拿不准的写进 missing_info。"
)


def repo_extract(url: str, repomap: RepoMapResult) -> tuple[str, str]:
    user = (
        f"GitHub URL: {url}\n"
        f"Repo map + 关键文件:\n{repomap.map_text}\n{repomap.readme}\n\n"
        "请提取: 描述 / topics / 语言 / 依赖 / 关键模块 / 入口 / API / 数据模型 / 活跃度 / license, "
        "并给出证据(指向文件:行号)与缺失项。"
    )
    return REPO_SYSTEM, user


# ─────────────────────────── 指纹合成 ───────────────────────────
FINGERPRINT_SYSTEM = (
    "你是项目指纹合成器。把网站事实、仓库事实、作者声明合并成一张可核验的项目卡。"
    " 重点比较'作者声称'与'实际证据'的差异, 有冲突写进 conflicts, 不确定写进 unknowns。"
    " observed_differentiators 里 proven=false 表示只是宣称、尚无证据。信息不足就降低 confidence。"
)


def fingerprint_synthesize(site: SiteFacts, repo: RepoFacts, statement: AuthorStatement) -> tuple[str, str]:
    user = (
        f"网站事实:\n{site.model_dump_json(indent=2)}\n\n"
        f"仓库事实:\n{repo.model_dump_json(indent=2)}\n\n"
        f"作者声明:\n{statement.model_dump()}\n\n"
        "请合成项目核心指纹: 一句话定义 / 目标用户 / 问题 / 输入-处理-输出 / 核心功能 / 商业模式 / "
        "作者声称的创新 / 系统观察到的差异(带证据+是否 proven) / functional_signature / 冲突 / 未知项。"
    )
    return FINGERPRINT_SYSTEM, user


# ─────────────────────────── 搜索 query ───────────────────────────
QUERY_SYSTEM = (
    "你是相似项目检索的 query 生成器。基于功能签名生成多组互补检索词, "
    "覆盖'同用户同任务''同输入输出不同实现''同机制不同人群', 中英文都要, 加常见同义词。"
)


def generate_queries(fp: ProjectFingerprint) -> tuple[str, str]:
    user = (
        f"功能签名: {fp.functional_signature}\n"
        f"目标用户: {fp.target_users}\n"
        f"要解决的问题: {fp.problem}\n"
        f"输入-处理-输出: {fp.io.model_dump()}\n\n生成 6-8 组检索 query。"
    )
    return QUERY_SYSTEM, user


# ─────────────────────────── 候选验证 ───────────────────────────
VERIFY_SYSTEM = (
    "你是竞品验证器。对候选项目套用与被测项目相同的指纹结构再比较, 避免被营销文案带偏。"
    " 输出关系分类(direct_competitor/alternative/adjacent/abandoned/superficial)与证据; 无法确认就降低 confidence。"
)


def verify_candidate(fp: ProjectFingerprint, candidate) -> tuple[str, str]:
    user = (
        f"被测项目指纹:\n{fp.model_dump_json(indent=2)}\n\n"
        f"候选:\n{candidate.model_dump_json(indent=2)}\n\n"
        "请深读候选并判断 relation, 给 notes 与证据。"
    )
    return VERIFY_SYSTEM, user


# ─────────────────────────── 重复度裁判 ───────────────────────────
JUDGE_SYSTEM = (
    "你是重复度裁判。基于被测项目指纹与已验证竞品, 按固定维度给 0-1 分, 汇总成 duplication_score。"
    " 严禁下'市场上没有竞品'的结论 —— 只能说'本次检索范围内'。每个结论带证据。"
)


def judge_duplication(fp: ProjectFingerprint, verified: list[VerifiedCandidate]) -> tuple[str, str]:
    listing = "\n".join(f"- {v.ref.name} [{v.relation.value}] {v.notes}" for v in verified)
    user = (
        f"被测项目指纹:\n{fp.model_dump_json(indent=2)}\n\n"
        f"已验证竞品 ({len(verified)} 个):\n{listing}\n\n"
        "请给出 dimensions 各维度分数、duplication_score、novelty 拆解、top_similar、rationale、"
        "search_scope_note(检索边界声明) 与证据。"
    )
    return JUDGE_SYSTEM, user


# ─────────────────────────── 事实层 ───────────────────────────
FACTLAYER_SYSTEM = (
    "你是事实层合成器。基于指纹、竞品、重复度裁判, 产出优点/问题/改进建议, 每条带证据; "
    " 改进按 impact 与 cost 标注并排序。只陈述有依据的结论 —— 毒舌版会复用这批结论, 不允许再新增。"
)


def synthesize_factlayer(fp: ProjectFingerprint, verdict: DuplicationVerdict,
                         verified: list[VerifiedCandidate]) -> tuple[str, str]:
    user = (
        f"指纹:\n{fp.model_dump_json(indent=2)}\n\n"
        f"重复度裁判:\n{verdict.model_dump_json(indent=2)}\n\n"
        f"竞品: {[v.ref.name for v in verified]}\n\n"
        "请产出 strengths / issues / improvements(带证据; improvements 按 impact,cost 排序)。"
    )
    return FACTLAYER_SYSTEM, user


# ─────────────────────────── 报告渲染 ───────────────────────────
SERIOUS_SYSTEM = (
    "你是认真的项目分析师。基于给定事实层写报告: 优势、问题、竞品借鉴、改进优先级。"
    " 客观、可执行。只用给定的事实, 不臆造。"
)
ROAST_SYSTEM = (
    "你是毒舌的项目锐评者。基于**完全相同**的事实层, 用犀利刻薄的语气写。"
    " 可以尖锐, 但每一句都必须对应给定事实; 不得新增未列出的攻击; 只锐评项目, 不攻击开发者本人。"
)


def render(result, tone: ToneMode) -> tuple[str, str]:
    system = ROAST_SYSTEM if tone is ToneMode.ROAST else SERIOUS_SYSTEM
    user = (
        f"项目: {result.fingerprint.one_liner}\n"
        f"重复度: {result.duplication.duplication_score} ({result.duplication.confidence.value})\n"
        f"检索边界: {result.duplication.search_scope_note}\n"
        f"优点: {[f.title for f in result.strengths]}\n"
        f"问题: {[f.title for f in result.issues]}\n"
        f"改进: {[i.title for i in result.improvements]}\n\n写 headline + body_markdown。"
    )
    return system, user
