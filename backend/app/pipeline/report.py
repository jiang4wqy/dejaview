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
    task = "render_roast" if tone is ToneMode.ROAST else "render_serious"
    system, prompt = prompts.render(result, tone)
    report = svc.llm.structured(task=task, schema_cls=Report,
                                system=system, prompt=prompt, tier=ModelTier.STANDARD)
    report.tone = tone
    # ★ 强制不变量: findings 只来自统一事实层
    report.findings = list(result.issues) + list(result.strengths)
    return report
