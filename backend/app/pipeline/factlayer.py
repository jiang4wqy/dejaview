"""factlayer —— 形成"统一事实层": 优点 / 问题 / 改进建议 (按影响×成本排序)。

这是认真版和毒舌版共同的事实底座。此后语气分叉, 但都只读这里, 不再重新调查。
每条 Finding / Improvement 都带证据。
"""
from __future__ import annotations

from pydantic import BaseModel, Field

from app.models.schemas import (
    AnalysisResult, DuplicationVerdict, Finding, Improvement, ProjectFingerprint,
    VerifiedCandidate,
)
from app.providers.llm_router import LLMRouter, ModelTier

SYSTEM = (
    "你是事实层合成器。基于指纹、竞品、重复度裁判, 产出优点/问题/改进建议。"
    " 每条都要带证据; 改进建议按 impact(影响) 与 cost(成本) 标注并排序。"
    " 只陈述有依据的结论 —— 后面的毒舌版会复用这批结论, 不允许再新增。"
)


class FactSynthesis(BaseModel):
    strengths: list[Finding] = Field(default_factory=list)
    issues: list[Finding] = Field(default_factory=list)
    improvements: list[Improvement] = Field(default_factory=list)


def assemble(
    fingerprint: ProjectFingerprint, verified: list[VerifiedCandidate],
    verdict: DuplicationVerdict, router: LLMRouter,
) -> AnalysisResult:
    prompt = (
        f"指纹:\n{fingerprint.model_dump_json(indent=2)}\n\n"
        f"重复度裁判:\n{verdict.model_dump_json(indent=2)}\n\n"
        f"竞品: {[v.ref.name for v in verified]}\n\n"
        "请产出 strengths / issues / improvements(带证据; improvements 按 impact,cost 排序)。"
    )
    synth = router.structured(task="synthesize_factlayer", schema_cls=FactSynthesis,
                              system=SYSTEM, prompt=prompt, tier=ModelTier.STANDARD)
    return AnalysisResult(
        fingerprint=fingerprint,
        candidates=verified,
        duplication=verdict,
        strengths=synth.strengths,
        issues=synth.issues,
        improvements=synth.improvements,
    )
