"""judge —— 重复度裁判。按固定维度打分, 给"重复造轮子概率 + 置信度 + 证据"。

不武断下"又一个套壳"。维度: 解决的问题 / 目标用户 / 输入输出工作流 / 功能重合 /
核心实现机制 / 项目独有且已证明的能力。并把创新拆成 新机制/新组合/新人群/更好执行/尚未证明。
用强模型 + 自适应思考。
"""
from __future__ import annotations

from app.models.schemas import DuplicationVerdict, ProjectFingerprint, VerifiedCandidate
from app.providers.llm_router import LLMRouter, ModelTier

SYSTEM = (
    "你是重复度裁判。基于被测项目指纹与已验证竞品, 按固定维度给 0-1 分, 汇总成 duplication_score。"
    " 严禁下'市场上没有竞品'的结论 —— 只能说'本次检索范围内'。每个结论带证据。"
)


def judge(
    fingerprint: ProjectFingerprint, verified: list[VerifiedCandidate], router: LLMRouter
) -> DuplicationVerdict:
    prompt = (
        f"被测项目指纹:\n{fingerprint.model_dump_json(indent=2)}\n\n"
        f"已验证竞品 ({len(verified)} 个):\n"
        + "\n".join(f"- {v.ref.name} [{v.relation.value}] {v.notes}" for v in verified)
        + "\n\n请给出 dimensions 各维度分数、duplication_score、novelty 拆解、top_similar、"
        "rationale、search_scope_note(检索边界声明) 与证据。"
    )
    return router.structured(task="judge_duplication", schema_cls=DuplicationVerdict,
                             system=SYSTEM, prompt=prompt, tier=ModelTier.STRONG, thinking=True)
