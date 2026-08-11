"""report —— 报告渲染器。读统一事实层, 按语气产出 Report。

核心不变量(代码强制): 毒舌版的 findings 一律取自统一事实层(issues + strengths),
模型只负责改写语气(headline / body_markdown), 不能新增未列出的事实或攻击。
"""
from __future__ import annotations

from app import prompts
from app.models.schemas import AnalysisResult, Report, ToneMode
from app.providers.llm_router import ModelTier
from app.services import Services


def render(result: AnalysisResult, tone: ToneMode, svc: Services) -> Report:
    task = f"render_{tone.value}"
    system, prompt = prompts.render(result, tone)
    # 渲染=按语气改写既有事实层, 非硬推理; 用 cheap(flash) 更快更省 ——
    # findings 由下方代码强制取自事实层, 与用哪个模型无关, 质量风险低。
    report = svc.llm.structured(task=task, schema_cls=Report,
                                system=system, prompt=prompt, tier=ModelTier.CHEAP)
    report.tone = tone
    # ★ 强制不变量: findings 只来自统一事实层
    report.findings = list(result.issues) + list(result.strengths)
    return report
