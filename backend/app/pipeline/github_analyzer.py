"""github_analyzer —— 读公开仓库 → 结构化 RepoFacts。

低 token 仓库理解由 svc.repomap 负责(Aider repo map / GitIngest)。GitHub 可选:
缺失或失败时降低置信度但流水线继续(大量真实商业网站并不开源)。
"""
from __future__ import annotations

from datetime import datetime, timezone

from app import prompts
from app.models.schemas import AnalysisRequest, Confidence, RepoFacts
from app.providers.llm_router import ModelTier
from app.services import Services


def empty(request: AnalysisRequest) -> RepoFacts:
    return RepoFacts(url=request.github_url, reachable=False, confidence=Confidence.LOW,
                     missing_info=["仓库分析失败, 代码层证据不足, 置信度下降"])


def analyze(request: AnalysisRequest, svc: Services) -> RepoFacts:
    if not request.github_url:
        return RepoFacts(reachable=False, confidence=Confidence.LOW,
                         missing_info=["未提供 GitHub 仓库(可选) —— 代码层证据缺失, 置信度下降"])
    key = svc.cache.key("repo", request.github_url, svc.repomap.name)
    cached = svc.cache.get(key)
    if cached is not None:
        svc.log.info("repo cache 命中: %s", request.github_url)
        return RepoFacts.model_validate(cached)
    repomap = svc.repomap.build(request.github_url)
    if repomap.note:
        svc.log.info("repomap(%s): %s", svc.repomap.name, repomap.note)
    system, prompt = prompts.repo_extract(request.github_url, repomap)
    facts = svc.llm.structured(task="extract_repo", schema_cls=RepoFacts,
                               system=system, prompt=prompt, tier=ModelTier.CHEAP)
    facts.url = facts.url or request.github_url
    facts.fetched_at = facts.fetched_at or datetime.now(timezone.utc)
    svc.cache.set(key, facts.model_dump(mode="json"))
    return facts
