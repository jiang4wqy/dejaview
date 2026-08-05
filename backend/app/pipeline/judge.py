"""judge —— 重复度裁判。按固定维度打分, 给"重复造轮子概率 + 置信度 + 证据"。用强模型 + 自适应思考。"""
from __future__ import annotations

from app import prompts
from app.models.schemas import DuplicationVerdict, ProjectFingerprint, VerifiedCandidate
from app.providers.llm_router import ModelTier
from app.services import Services


def judge(
    fingerprint: ProjectFingerprint, verified: list[VerifiedCandidate], svc: Services
) -> DuplicationVerdict:
    system, prompt = prompts.judge_duplication(fingerprint, verified)
    return svc.llm.structured(task="judge_duplication", schema_cls=DuplicationVerdict,
                              system=system, prompt=prompt, tier=ModelTier.STRONG, thinking=True)
