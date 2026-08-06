"""site_analyzer —— 抓取网站 → 结构化 SiteFacts。

抓取(svc.crawler)= 零 token 结构化提取; 只有抽取那一步(svc.llm)才喂给模型。
`empty()` 是编排层做优雅降级时用的兜底(抓取失败 → 低置信度事实, 流水线继续)。
"""
from __future__ import annotations

from datetime import datetime, timezone

from app import prompts
from app.models.schemas import AnalysisRequest, Confidence, SiteFacts
from app.providers.llm_router import ModelTier
from app.services import Services


def empty(request: AnalysisRequest) -> SiteFacts:
    return SiteFacts(url=request.website_url, reachable=bool(request.website_url),
                     confidence=Confidence.LOW, missing_info=["网站分析缺失或失败, 置信度下降"])


def analyze(request: AnalysisRequest, svc: Services) -> SiteFacts:
    if not request.website_url:
        return SiteFacts(reachable=False, confidence=Confidence.LOW, missing_info=["未提供网站 URL"])
    key = svc.cache.key("site", request.website_url, svc.crawler.name,
                        request.author_statement.model_dump_json())
    cached = svc.cache.get(key)
    if cached is not None:
        svc.log.info("site cache 命中: %s", request.website_url)
        return SiteFacts.model_validate(cached)
    crawl = svc.crawler.crawl(request.website_url)
    if crawl.note:
        svc.log.info("crawler(%s): %s", svc.crawler.name, crawl.note)
    system, prompt = prompts.site_extract(request.website_url, request.author_statement, crawl)
    facts = svc.llm.structured(task="extract_site", schema_cls=SiteFacts,
                               system=system, prompt=prompt, tier=ModelTier.CHEAP)
    facts.url = facts.url or request.website_url
    facts.requires_login = facts.requires_login or crawl.requires_login
    facts.fetched_at = facts.fetched_at or datetime.now(timezone.utc)
    svc.cache.set(key, facts.model_dump(mode="json"))
    return facts
