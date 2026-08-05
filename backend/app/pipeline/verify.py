"""verify —— 对排名靠前的候选深读, 用同一套指纹结构判断关系(不只比营销文案)。"""
from __future__ import annotations

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


def verify_candidates(
    candidates: list[CandidateRef], fingerprint: ProjectFingerprint, svc: Services
) -> list[VerifiedCandidate]:
    out: list[VerifiedCandidate] = []
    for cand in candidates[: svc.settings.max_candidates_deep_read]:
        system, prompt = prompts.verify_candidate(fingerprint, cand)
        a = svc.llm.structured(task="verify_candidate", schema_cls=CandidateAssessment,
                               system=system, prompt=prompt, tier=ModelTier.STANDARD)
        out.append(VerifiedCandidate(
            ref=cand, relation=a.relation, notes=a.notes,
            confidence=a.confidence, fingerprint=a.fingerprint, evidence=a.evidence,
        ))
    return out
