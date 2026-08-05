"""search —— 根据项目指纹生成多组 query, 召回相似项目候选 (只召回, 不下结论)。

不能只搜项目名/营销词。基于"功能签名"生成多组查询:
  * 同目标用户 + 同任务
  * 同输入输出, 但实现方式不同
  * 同核心机制, 面向不同人群
覆盖 GitHub / Product Hunt / AlternativeTo / G2 / 普通网页 / 中文社区; 中英文 + 同义词。
执行端是可插拔的 SearchClient (见 providers/search_client.py)。
"""
from __future__ import annotations

from pydantic import BaseModel, Field

from app.config import Settings
from app.models.schemas import CandidateRef
from app.providers.llm_router import LLMRouter, ModelTier
from app.providers.search_client import SearchClient

SYSTEM = (
    "你是相似项目检索的 query 生成器。基于功能签名生成多组互补的检索词, "
    "覆盖'同用户同任务''同输入输出不同实现''同机制不同人群', 中英文都要, 加常见同义词。"
)


class QuerySet(BaseModel):
    queries: list[str] = Field(default_factory=list)


def find(
    fingerprint, router: LLMRouter, client: SearchClient, settings: Settings
) -> list[CandidateRef]:
    prompt = (
        f"功能签名: {fingerprint.functional_signature}\n"
        f"目标用户: {fingerprint.target_users}\n"
        f"要解决的问题: {fingerprint.problem}\n"
        f"输入-处理-输出: {fingerprint.io.model_dump()}\n\n"
        "生成 6-8 组检索 query。"
    )
    qs = router.structured(task="generate_queries", schema_cls=QuerySet,
                           system=SYSTEM, prompt=prompt, tier=ModelTier.CHEAP)

    seen: set[tuple[str, str]] = set()
    out: list[CandidateRef] = []
    for q in qs.queries[: settings.max_queries]:
        router.meter.search_queries += 1
        for cand in client.search(q):
            key = (cand.name.strip().lower(), cand.url.strip().lower())
            if key in seen:
                continue
            seen.add(key)
            out.append(cand)
    return out
