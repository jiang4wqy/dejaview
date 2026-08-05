"""verify —— 对排名靠前的候选深读, 用同一套指纹结构判断关系 (不只比营销文案)。

先浅读 20-30 个候选(search 阶段), 这里只深读前 N 个 (settings.max_candidates_deep_read),
分类为: 直接竞品 / 替代方案 / 相邻产品 / 已停止维护 / 表面类似实则不同。
"""
from __future__ import annotations

from typing import Optional

from pydantic import BaseModel

from app.config import Settings
from app.models.schemas import (
    CandidateRef, Confidence, Evidence, ProjectFingerprint, Relation, VerifiedCandidate,
)
from app.providers.llm_router import LLMRouter, ModelTier

SYSTEM = (
    "你是竞品验证器。对候选项目套用与被测项目相同的指纹结构再比较, 避免被营销文案带偏。"
    " 输出关系分类与证据; 无法确认就降低 confidence。"
)


class CandidateAssessment(BaseModel):
    """verify 的单候选中间结果 (LLM 输出), 由模块包装成 VerifiedCandidate。"""
    relation: Relation
    notes: str = ""
    confidence: Confidence = Confidence.MEDIUM
    fingerprint: Optional[ProjectFingerprint] = None
    evidence: list[Evidence] = []


def verify_candidates(
    candidates: list[CandidateRef], fingerprint: ProjectFingerprint,
    router: LLMRouter, settings: Settings,
) -> list[VerifiedCandidate]:
    out: list[VerifiedCandidate] = []
    for cand in candidates[: settings.max_candidates_deep_read]:
        prompt = (
            f"被测项目指纹:\n{fingerprint.model_dump_json(indent=2)}\n\n"
            f"候选:\n{cand.model_dump_json(indent=2)}\n\n"
            "请深读候选并判断 relation "
            "(direct_competitor/alternative/adjacent/abandoned/superficial), 给 notes 与证据。"
        )
        a = router.structured(task="verify_candidate", schema_cls=CandidateAssessment,
                              system=SYSTEM, prompt=prompt, tier=ModelTier.STANDARD)
        out.append(VerifiedCandidate(
            ref=cand, relation=a.relation, notes=a.notes,
            confidence=a.confidence, fingerprint=a.fingerprint, evidence=a.evidence,
        ))
    return out
