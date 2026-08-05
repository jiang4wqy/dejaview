"""site_analyzer —— 抓取网站 → 结构化 SiteFacts。

真实实现应: 抓首页/功能/价格/文档/关于页 + sitemap → 干净 markdown → 便宜模型抽取。
抓取本身是"零 token 结构化提取", 只有抽取那一步才喂给模型。
当前: _crawl 为 stub (见 docs/TODO.md); 抽取调用 router.structured('extract_site', ...)。
"""
from __future__ import annotations

from datetime import datetime, timezone

from app.models.schemas import AnalysisRequest, Confidence, SiteFacts
from app.providers.llm_router import LLMRouter, ModelTier

SYSTEM = (
    "你是网站事实提取器。只输出能被页面证据支撑的事实; 拿不准或页面没有的, 留空并写进 missing_info。"
    " 区分'营销文案宣称'与'实际功能'。不要臆造。"
)


def _crawl(url: str) -> str:
    # TODO: Firecrawl / Crawl4AI 抓取 (首页/功能/价格/文档/关于 + sitemap + 截图), 输出干净 markdown
    return f"[TODO: 抓取占位, 真实实现见 docs/TODO.md] {url}"


def analyze(request: AnalysisRequest, router: LLMRouter) -> SiteFacts:
    if not request.website_url:
        return SiteFacts(reachable=False, confidence=Confidence.LOW,
                         missing_info=["未提供网站 URL"])
    markdown = _crawl(request.website_url)
    prompt = (
        f"网站 URL: {request.website_url}\n"
        f"作者声明(参考, 需与页面证据交叉验证): {request.author_statement.model_dump()}\n"
        f"抓取内容(markdown):\n{markdown}\n\n"
        "请提取: 目标用户 / 核心承诺 / 输入输出 / 功能列表 / 使用流程 / 定价 / 商业模式, "
        "并给出证据(evidence)与缺失项(missing_info); 若需要登录才能理解, 置 requires_login=true 并降低 confidence。"
    )
    facts = router.structured(task="extract_site", schema_cls=SiteFacts,
                              system=SYSTEM, prompt=prompt, tier=ModelTier.CHEAP)
    facts.url = facts.url or request.website_url
    facts.fetched_at = facts.fetched_at or datetime.now(timezone.utc)
    return facts
