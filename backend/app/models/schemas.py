"""
DejaView — 数据契约 (Data Contracts)
====================================

这是整个系统的"固定输入输出契约"。每个流水线模块的输入 / 输出都是这里定义的
Pydantic 模型。**修改这里的模型需要通知所有模块负责人** —— 它是多人分工的地基。

数据流 (与锁定的产品流程一致):

    AnalysisRequest
        │
        ├── site_analyzer   ──▶ SiteFacts
        ├── github_analyzer ──▶ RepoFacts
        │
        └── fingerprint     ──▶ ProjectFingerprint     (合并 + 作者声明 + 证据)
                │  (可选的"用户确认"成本闸门)
                ├── search  ──▶ list[CandidateRef]      (只召回, 不下结论)
                ├── verify  ──▶ list[VerifiedCandidate] (深读 + 分类)
                ├── judge   ──▶ DuplicationVerdict       (重复度裁判)
                └── factlayer ──▶ AnalysisResult         (统一事实层: 优点/问题/改进)
                        │
                        └── report ──▶ Report            (认真 / 毒舌, 共享同一事实层)

设计原则:
  * 事实层统一, 语气层分叉 —— 毒舌版不新增未经证实的攻击。
  * 每条结论都带 Evidence(证据位置 + 置信度)。
  * 缺信息就显式降低 confidence, 不假装"全面理解"。
"""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, model_validator


# ─────────────────────────── 基础枚举 / 通用块 ───────────────────────────

class Confidence(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class ToneMode(str, Enum):
    SERIOUS = "serious"   # 认真探讨
    ROAST = "roast"       # 毒舌锐评


class SourceType(str, Enum):
    WEBSITE = "website"
    GITHUB_README = "github_readme"
    GITHUB_CODE = "github_code"
    GITHUB_CONFIG = "github_config"
    GITHUB_META = "github_meta"        # stars / releases / activity
    SEARCH_RESULT = "search_result"
    AUTHOR_CLAIM = "author_claim"
    METRIC = "metric"                  # lighthouse / core web vitals


class Evidence(BaseModel):
    """一条可核验的证据。UI 上"点开证据"指向这里。"""
    source_type: SourceType
    locator: str = Field(..., description="URL / 文件路径:行号 / 页面区块等定位符")
    quote: str = Field("", description="支撑结论的简短原文片段(控制 token)")
    confidence: Confidence = Confidence.MEDIUM
    note: str = ""


class Finding(BaseModel):
    """优点 / 问题的统一结构。认真版和毒舌版共享同一批 Finding。"""
    id: str
    category: str = Field(..., description="novelty / feature / execution / positioning / risk ...")
    title: str
    detail: str
    evidence: list[Evidence] = Field(default_factory=list)
    severity: str = Field("info", description="strength | info | minor | major | critical")
    confidence: Confidence = Confidence.MEDIUM


class Improvement(BaseModel):
    id: str
    title: str
    rationale: str
    impact: str = Field("medium", description="high | medium | low")
    cost: str = Field("medium", description="high | medium | low")
    learn_from: list[str] = Field(default_factory=list, description="可借鉴的竞品名 / URL")
    evidence: list[Evidence] = Field(default_factory=list)


# ─────────────────────────────── 输入 ───────────────────────────────

class AuthorStatement(BaseModel):
    """提交时让作者回答的三个问题 —— 用于校准, 减少理解跑偏。"""
    target_users: str = Field("", description="这个项目给谁用?")
    problem_solved: str = Field("", description="解决什么具体问题?")
    claimed_novelty: str = Field("", description="你认为最不同的地方是什么?")


class AnalysisRequest(BaseModel):
    website_url: Optional[str] = None
    github_url: Optional[str] = None
    author_statement: AuthorStatement = Field(default_factory=AuthorStatement)
    tone: ToneMode = ToneMode.SERIOUS
    # 成本闸门: 生成项目指纹后是否暂停, 等用户确认再跑昂贵的搜索
    confirm_fingerprint: bool = False
    language: str = Field("zh", description="报告语言")

    @model_validator(mode="after")
    def _need_one_source(self) -> "AnalysisRequest":
        if not self.website_url and not self.github_url:
            raise ValueError("website_url 和 github_url 至少提供一个")
        return self


# ──────────────────────── 网站事实 / 仓库事实 ────────────────────────

class KeyPage(BaseModel):
    type: str  # home / features / pricing / docs / about ...
    url: str
    title: str = ""


class SiteFacts(BaseModel):
    """site_analyzer 的输出。抓取 = 零 token 结构化提取; 仅在需要时喂给模型。"""
    url: Optional[str] = None
    fetched_at: Optional[datetime] = None
    reachable: bool = True
    requires_login: bool = False    # 需要登录 => 无法仅靠公开 URL 全面理解
    title: str = ""
    description: str = ""
    target_users: str = ""
    core_promise: str = ""
    inputs: str = ""
    outputs: str = ""
    feature_list: list[str] = Field(default_factory=list)
    use_flow: list[str] = Field(default_factory=list)
    pricing: str = ""
    business_model: str = ""
    key_pages: list[KeyPage] = Field(default_factory=list)
    screenshots: list[str] = Field(default_factory=list)     # 文件路径, TODO
    objective_metrics: dict = Field(default_factory=dict)    # lighthouse / cwv, TODO
    raw_markdown_ref: str = ""       # 抓取后 markdown 的缓存路径(不内联进上下文)
    evidence: list[Evidence] = Field(default_factory=list)
    missing_info: list[str] = Field(default_factory=list)
    confidence: Confidence = Confidence.MEDIUM


class KeyModule(BaseModel):
    path: str
    role: str = ""   # 一句话: 这个文件 / 模块干嘛的


class RepoActivity(BaseModel):
    stars: Optional[int] = None
    forks: Optional[int] = None
    last_commit_at: Optional[datetime] = None
    recent_release: str = ""
    commit_frequency: str = ""   # active | moderate | stale


class RepoFacts(BaseModel):
    """github_analyzer 的输出。低 token 仓库理解: repo map + 定向读关键文件。"""
    url: Optional[str] = None
    fetched_at: Optional[datetime] = None
    reachable: bool = True
    description: str = ""
    topics: list[str] = Field(default_factory=list)
    primary_language: str = ""
    languages: list[str] = Field(default_factory=list)
    readme_summary: str = ""
    dependencies: list[str] = Field(default_factory=list)
    config_files: list[str] = Field(default_factory=list)
    key_modules: list[KeyModule] = Field(default_factory=list)
    entrypoints: list[str] = Field(default_factory=list)
    api_routes: list[str] = Field(default_factory=list)
    data_models: list[str] = Field(default_factory=list)
    repo_map_ref: str = ""            # Aider 风格 repo map 缓存路径
    activity: RepoActivity = Field(default_factory=RepoActivity)
    license: str = ""
    evidence: list[Evidence] = Field(default_factory=list)
    missing_info: list[str] = Field(default_factory=list)
    confidence: Confidence = Confidence.MEDIUM


# ─────────────────────────── 项目核心指纹 ───────────────────────────

class IOFlow(BaseModel):
    input: str = ""
    processing: str = ""
    output: str = ""


class Differentiator(BaseModel):
    description: str
    evidence: list[Evidence] = Field(default_factory=list)
    proven: bool = False   # 是否有证据支撑(vs 仅宣称)


class ProjectFingerprint(BaseModel):
    """项目核心指纹 —— 整个产品最重要的成本控制关口, 用户可编辑确认。"""
    one_liner: str = ""
    target_users: str = ""
    problem: str = ""
    io: IOFlow = Field(default_factory=IOFlow)
    core_features: list[str] = Field(default_factory=list)
    business_model: str = ""
    claimed_novelty: list[str] = Field(default_factory=list)              # 作者声称
    observed_differentiators: list[Differentiator] = Field(default_factory=list)  # 系统观察
    # 功能签名: 驱动"相似项目搜索"的核心 query 素材
    functional_signature: str = Field(
        "", description="为哪类用户 / 在什么场景 / 接收什么输入 / 通过什么机制 / 产生什么结果"
    )
    conflicts: list[str] = Field(default_factory=list)   # 宣称 vs 证据 的冲突
    unknowns: list[str] = Field(default_factory=list)
    evidence: list[Evidence] = Field(default_factory=list)
    confidence: Confidence = Confidence.MEDIUM
    user_confirmed: bool = False   # 用户是否已确认 / 修正


# ──────────────────── 相似项目搜索 / 验证 / 裁判 ────────────────────

class CandidateSource(str, Enum):
    GITHUB = "github"
    PRODUCT_HUNT = "product_hunt"
    ALTERNATIVETO = "alternativeto"
    G2 = "g2"
    WEB = "web"
    CN_COMMUNITY = "cn_community"   # V2EX / 少数派 / 掘金 ...


class CandidateRef(BaseModel):
    """search 的输出。只负责"召回候选", 不下结论。"""
    name: str
    url: str = ""
    source: CandidateSource = CandidateSource.WEB
    snippet: str = ""
    query_used: str = ""
    why_surfaced: str = ""


class Relation(str, Enum):
    DIRECT_COMPETITOR = "direct_competitor"
    ALTERNATIVE = "alternative"
    ADJACENT = "adjacent"            # 可学习的相邻产品
    ABANDONED = "abandoned"          # 已停止维护
    SUPERFICIAL = "superficial"      # 表面类似实则不同


class VerifiedCandidate(BaseModel):
    """verify 的输出。对候选套用同一套指纹结构, 避免只比营销文案。"""
    ref: CandidateRef
    fingerprint: Optional[ProjectFingerprint] = None   # 候选的(轻量)指纹
    relation: Relation
    notes: str = ""
    evidence: list[Evidence] = Field(default_factory=list)
    confidence: Confidence = Confidence.MEDIUM


class NoveltyType(str, Enum):
    NEW_MECHANISM = "new_mechanism"        # 新机制
    NEW_COMBINATION = "new_combination"    # 新组合
    NEW_AUDIENCE = "new_audience"          # 新人群
    BETTER_EXECUTION = "better_execution"  # 更好的执行
    UNPROVEN = "unproven"                  # 尚未证明


class NoveltyClaim(BaseModel):
    type: NoveltyType
    description: str
    evidence: list[Evidence] = Field(default_factory=list)


class DuplicationDimensions(BaseModel):
    """固定维度评分 (0~1)。"""
    same_problem: float = 0.0       # 解决的问题是否相同
    same_users: float = 0.0         # 目标用户是否相同
    same_io_flow: float = 0.0       # 输入输出 / 工作流是否相同
    feature_overlap: float = 0.0    # 功能重合程度
    same_mechanism: float = 0.0     # 核心实现机制
    unique_proven: float = 0.0      # 项目独有且已被证明的能力(越高越不重复)


class DuplicationVerdict(BaseModel):
    """重复度裁判 (judge)。给概率 + 置信度 + 证据, 不武断下'又一个套壳'。"""
    duplication_score: float = Field(0.0, ge=0.0, le=1.0)   # 重复造轮子概率
    confidence: Confidence = Confidence.MEDIUM
    dimensions: DuplicationDimensions = Field(default_factory=DuplicationDimensions)
    novelty: list[NoveltyClaim] = Field(default_factory=list)
    top_similar: list[str] = Field(default_factory=list)     # 候选名 / URL
    rationale: str = ""
    # 检索边界声明: 不能说"市场上没有竞品", 只能说"本次检索范围内未找到"
    search_scope_note: str = ""
    evidence: list[Evidence] = Field(default_factory=list)


# ─────────────────────── 统一事实层 / 报告 ───────────────────────

class AnalysisResult(BaseModel):
    """统一事实层。认真版和毒舌版都只读这里, 不各自重新调查。"""
    fingerprint: ProjectFingerprint
    candidates: list[VerifiedCandidate] = Field(default_factory=list)
    duplication: DuplicationVerdict
    strengths: list[Finding] = Field(default_factory=list)
    issues: list[Finding] = Field(default_factory=list)
    improvements: list[Improvement] = Field(default_factory=list)  # 按 impact / cost 排序


class Report(BaseModel):
    tone: ToneMode
    headline: str = ""
    body_markdown: str = ""
    findings: list[Finding] = Field(default_factory=list)   # 携带证据, 供 UI 点开
    share_card_ref: str = ""   # 分享图路径, TODO (GitBox 风格)


# ─────────────────────────────── Job ───────────────────────────────

class Stage(str, Enum):
    SUBMITTED = "submitted"
    SITE_ANALYSIS = "site_analysis"
    GITHUB_ANALYSIS = "github_analysis"
    FINGERPRINT = "fingerprint"
    AWAIT_CONFIRM = "await_confirm"
    SEARCH = "search"
    VERIFY = "verify"
    JUDGE = "judge"
    FACTLAYER = "factlayer"
    RENDER = "render"
    DONE = "done"
    ERROR = "error"


class JobStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    AWAIT_CONFIRM = "await_confirm"
    DONE = "done"
    ERROR = "error"


class CostMeter(BaseModel):
    """token / 成本可观测性 —— 每个报告的 LLM 调用、token、搜索次数、耗时。"""
    llm_calls: int = 0
    input_tokens: int = 0
    output_tokens: int = 0
    search_queries: int = 0
    seconds: float = 0.0


class Job(BaseModel):
    id: str
    status: JobStatus = JobStatus.QUEUED
    stage: Stage = Stage.SUBMITTED
    progress: float = 0.0
    created_at: datetime
    updated_at: datetime
    request: AnalysisRequest
    # 中间产物 (便于调试 & 缓存 & 让用户确认指纹)
    site_facts: Optional[SiteFacts] = None
    repo_facts: Optional[RepoFacts] = None
    pending_fingerprint: Optional[ProjectFingerprint] = None  # 成本闸门: 等用户确认/修正的指纹
    result: Optional[AnalysisResult] = None
    reports: dict[str, Report] = Field(default_factory=dict)  # tone.value -> Report
    cost: CostMeter = Field(default_factory=CostMeter)
    error: str = ""
