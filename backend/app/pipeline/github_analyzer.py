"""github_analyzer —— 读公开仓库 → 结构化 RepoFacts。

低 token 仓库理解 (借鉴 Aider Repo Map):
  1) 仓库结构 + repo map (~1-2K token)
  2) README / 配置 / 依赖 (~3-5K)
  3) 按疑问定向读 3-6 个关键文件
不建议把整个仓库塞给模型。GitHub 可选 —— 缺失时降低整体置信度。
当前: _build_repo_map 为 stub (见 docs/TODO.md)。
"""
from __future__ import annotations

from datetime import datetime, timezone

from app.models.schemas import AnalysisRequest, Confidence, RepoFacts
from app.providers.llm_router import LLMRouter, ModelTier

SYSTEM = (
    "你是代码仓库事实提取器。基于 repo map 与关键文件, 提取真实实现(不是 README 吹的)。"
    " 关注: 入口/API/数据模型/关键机制/活跃度。拿不准的写进 missing_info。"
)


def _build_repo_map(url: str) -> str:
    # TODO: Aider Repo Map / GitIngest / Repomix —— 图排序后在 token 预算内选最重要内容
    return f"[TODO: repo map 占位, 真实实现见 docs/TODO.md] {url}"


def analyze(request: AnalysisRequest, router: LLMRouter) -> RepoFacts:
    if not request.github_url:
        # GitHub 可选: 缺失时不报错, 但明确降低置信度 (大量真实商业网站并不开源)
        return RepoFacts(reachable=False, confidence=Confidence.LOW,
                         missing_info=["未提供 GitHub 仓库(可选) —— 代码层证据缺失, 置信度下降"])
    repo_map = _build_repo_map(request.github_url)
    prompt = (
        f"GitHub URL: {request.github_url}\n"
        f"Repo map + 关键文件:\n{repo_map}\n\n"
        "请提取: 描述/topics/语言/依赖/关键模块/入口/API/数据模型/活跃度/license, "
        "并给出证据(evidence, 指向文件:行号)与缺失项。"
    )
    facts = router.structured(task="extract_repo", schema_cls=RepoFacts,
                              system=SYSTEM, prompt=prompt, tier=ModelTier.CHEAP)
    facts.url = facts.url or request.github_url
    facts.fetched_at = facts.fetched_at or datetime.now(timezone.utc)
    return facts
