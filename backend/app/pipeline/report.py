"""report —— 报告渲染器。读统一事实层, 按语气产出 Report。

核心不变量 (在代码里强制, 不靠模型自觉):
    毒舌版的 findings 一律取自统一事实层 (result.issues + result.strengths),
    模型只负责改写"语气"(headline / body_markdown), 不能新增未列出的事实或攻击。
    => "刻薄可以主观, 事实不能主观; 锐评项目, 不攻击开发者本人。"
"""
from __future__ import annotations

from app.models.schemas import AnalysisResult, Report, ToneMode
from app.providers.llm_router import LLMRouter, ModelTier

SYSTEM_SERIOUS = (
    "你是认真的项目分析师。基于给定事实层写报告: 优势、问题、竞品借鉴、改进优先级。"
    " 客观、可执行。只用给定的事实, 不臆造。"
)
SYSTEM_ROAST = (
    "你是毒舌的项目锐评者。基于**完全相同**的事实层, 用犀利刻薄的语气写。"
    " 可以尖锐, 但每一句都必须对应给定事实; 不得新增未列出的攻击; 只锐评项目, 不攻击开发者本人。"
)


def render(result: AnalysisResult, tone: ToneMode, router: LLMRouter) -> Report:
    is_roast = tone is ToneMode.ROAST
    task = "render_roast" if is_roast else "render_serious"
    system = SYSTEM_ROAST if is_roast else SYSTEM_SERIOUS
    prompt = (
        f"项目: {result.fingerprint.one_liner}\n"
        f"重复度: {result.duplication.duplication_score} ({result.duplication.confidence.value})\n"
        f"检索边界: {result.duplication.search_scope_note}\n"
        f"优点: {[f.title for f in result.strengths]}\n"
        f"问题: {[f.title for f in result.issues]}\n"
        f"改进: {[i.title for i in result.improvements]}\n\n"
        "写 headline + body_markdown。"
    )
    report = router.structured(task=task, schema_cls=Report,
                               system=system, prompt=prompt, tier=ModelTier.STANDARD)
    report.tone = tone
    # ★ 强制不变量: findings 只来自统一事实层, 保证毒舌版不新增未证实结论
    report.findings = list(result.issues) + list(result.strengths)
    return report
