"""fingerprint —— 合并网站事实 + 仓库事实 + 作者声明 → ProjectFingerprint。

这是整个产品最重要的成本控制关口:
  * 交叉验证 "作者声称 × 页面呈现 × 代码/文档证据 × (稍后)竞品已有能力"
  * 生成 functional_signature 驱动后续搜索
  * 标注 conflicts / unknowns, 缺信息就降 confidence
先把这张卡给用户确认(可选闸门), 用户纠正后再启动昂贵的搜索。
"""
from __future__ import annotations

from app.models.schemas import AuthorStatement, ProjectFingerprint, RepoFacts, SiteFacts
from app.providers.llm_router import LLMRouter, ModelTier

SYSTEM = (
    "你是项目指纹合成器。把网站事实、仓库事实、作者声明合并成一张可核验的项目卡。"
    " 重点比较'作者声称'与'实际证据'的差异, 有冲突写进 conflicts, 不确定写进 unknowns。"
    " observed_differentiators 里 proven=false 表示只是宣称、尚无证据。"
)


def synthesize(
    site: SiteFacts, repo: RepoFacts, statement: AuthorStatement, router: LLMRouter
) -> ProjectFingerprint:
    prompt = (
        f"网站事实:\n{site.model_dump_json(indent=2)}\n\n"
        f"仓库事实:\n{repo.model_dump_json(indent=2)}\n\n"
        f"作者声明:\n{statement.model_dump()}\n\n"
        "请合成项目核心指纹: 一句话定义 / 目标用户 / 问题 / 输入-处理-输出 / 核心功能 / "
        "商业模式 / 作者声称的创新 / 系统观察到的差异(带证据+是否proven) / functional_signature / "
        "冲突 / 未知项。信息不足就降低 confidence。"
    )
    return router.structured(task="synthesize_fingerprint", schema_cls=ProjectFingerprint,
                             system=SYSTEM, prompt=prompt, tier=ModelTier.STANDARD)
