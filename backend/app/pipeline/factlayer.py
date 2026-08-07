"""factlayer —— 形成"统一事实层": 优点 / 问题 / 改进建议(按影响×成本排序), 每条带证据。

认真版和毒舌版共同的事实底座; 此后语气分叉, 但都只读这里, 不再重新调查。
"""
from __future__ import annotations

from pydantic import BaseModel, Field

from app import prompts
from app.models.schemas import (
    AnalysisResult, DuplicationVerdict, Finding, Improvement, ProjectFingerprint, VerifiedCandidate,
)
from app.providers.llm_router import ModelTier
from app.services import Services


class FactSynthesis(BaseModel):
    strengths: list[Finding] = Field(default_factory=list)
    issues: list[Finding] = Field(default_factory=list)
    improvements: list[Improvement] = Field(default_factory=list)


def assemble(
    fingerprint: ProjectFingerprint, verified: list[VerifiedCandidate],
    verdict: DuplicationVerdict, svc: Services,
) -> AnalysisResult:
    system, prompt = prompts.synthesize_factlayer(fingerprint, verdict, verified)
    synth = svc.llm.structured(task="synthesize_factlayer", schema_cls=FactSynthesis,
                               system=system, prompt=prompt, tier=ModelTier.STANDARD)
    return AnalysisResult(
        fingerprint=fingerprint, candidates=verified, duplication=verdict,
        strengths=synth.strengths, issues=synth.issues, improvements=synth.improvements,
    )
