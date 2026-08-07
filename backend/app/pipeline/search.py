"""search —— 根据项目指纹生成多组 query, 召回相似项目候选(只召回, 不下结论)。

基于功能签名生成多组查询, 执行端(svc.search)可插拔。search 模块负责去重。
"""
from __future__ import annotations

from pydantic import BaseModel, Field

from app import prompts
from app.errors import SearchError
from app.models.schemas import CandidateRef, ProjectFingerprint
from app.providers.llm_router import ModelTier
from app.services import Services


class QuerySet(BaseModel):
    queries: list[str] = Field(default_factory=list)


def find(fingerprint: ProjectFingerprint, svc: Services) -> list[CandidateRef]:
    system, prompt = prompts.generate_queries(fingerprint)
    qs = svc.llm.structured(task="generate_queries", schema_cls=QuerySet,
                            system=system, prompt=prompt, tier=ModelTier.CHEAP)

    seen: set[tuple[str, str]] = set()
    out: list[CandidateRef] = []
    for q in qs.queries[: svc.settings.max_queries]:
        svc.meter.search_queries += 1
        try:
            hits = svc.search.search(q)
        except SearchError as e:
            svc.log.warning("搜索 query 失败, 跳过: %s", e)   # 单个 query 失败不影响其它
            continue
        for cand in hits:
            key = (cand.name.strip().lower(), cand.url.strip().lower())
            if key in seen:
                continue
            seen.add(key)
            out.append(cand)
    return out
