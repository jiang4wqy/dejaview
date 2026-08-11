"""verify —— 对排名靠前的候选深读, 用同一套指纹结构判断关系(不只比营销文案)。

候选之间相互独立, 因此**并行深读**(ThreadPoolExecutor), 把 N 次贵模型调用的墙钟时间
从 N×t 降到 ~t。meter 累加在 LLMRouter 里已加锁。
"""
from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from typing import Optional

from pydantic import BaseModel

from app import prompts
from app.models.schemas import (
    CandidateRef, Confidence, Evidence, ProjectFingerprint, Relation, VerifiedCandidate,
)
from app.providers.llm_router import ModelTier
from app.services import Services


class CandidateAssessment(BaseModel):
    """verify 的单候选中间结果(LLM 输出), 由模块包装成 VerifiedCandidate。"""
    relation: Relation
    notes: str = ""
    confidence: Confidence = Confidence.MEDIUM
    fingerprint: Optional[ProjectFingerprint] = None
    evidence: list[Evidence] = []


def _deep_read_count(n_available: int, floor: int, ceiling: int) -> int:
    """候选池越大(已过 search._rank 的相关性筛选), 深读读的越多, 但封顶 ceiling。

    - 候选数不超过 floor: 全读, 不用凑数。
    - 候选数超过 floor: 按池子规模的一半往 ceiling 靠, 池子越大越接近上限。
    - 最终结果 clamp 到 [0, min(n_available, ceiling)]。
    """
    if n_available <= floor:
        n = n_available
    else:
        n = min(ceiling, floor + (n_available - floor + 1) // 2)
    hi = min(n_available, ceiling)
    return max(0, min(n, hi))


def verify_candidates(
    candidates: list[CandidateRef], fingerprint: ProjectFingerprint, svc: Services
) -> list[VerifiedCandidate]:
    k = _deep_read_count(
        len(candidates), svc.settings.max_candidates_deep_read, svc.settings.max_deep_read_ceiling
    )
    cands = candidates[:k]
    if not cands:
        return []

    def _one(cand: CandidateRef) -> VerifiedCandidate:
        system, prompt = prompts.verify_candidate(fingerprint, cand)
        a = svc.llm.structured(task="verify_candidate", schema_cls=CandidateAssessment,
                               system=system, prompt=prompt, tier=ModelTier.STANDARD)
        return VerifiedCandidate(
            ref=cand, relation=a.relation, notes=a.notes,
            confidence=a.confidence, fingerprint=a.fingerprint, evidence=a.evidence,
        )

    with ThreadPoolExecutor(max_workers=min(svc.settings.verify_concurrency, len(cands))) as ex:
        return list(ex.map(_one, cands))   # map 保持顺序
