"""fingerprint —— 合并网站事实 + 仓库事实 + 作者声明 → ProjectFingerprint。

产品最重要的成本控制关口: 交叉验证'声称 × 页面 × 代码', 生成 functional_signature 驱动搜索,
标注 conflicts / unknowns。用户可确认/修正后再启动昂贵的搜索(见 orchestrator 的成本闸门)。
"""
from __future__ import annotations

from app import prompts
from app.models.schemas import AuthorStatement, ProjectFingerprint, RepoFacts, SiteFacts
from app.providers.llm_router import ModelTier
from app.services import Services


def synthesize(
    site: SiteFacts, repo: RepoFacts, statement: AuthorStatement, svc: Services
) -> ProjectFingerprint:
    system, prompt = prompts.fingerprint_synthesize(site, repo, statement)
    return svc.llm.structured(task="synthesize_fingerprint", schema_cls=ProjectFingerprint,
                              system=system, prompt=prompt, tier=ModelTier.STANDARD)
