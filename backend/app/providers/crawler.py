"""网站抓取执行端(可插拔)。抓取 = 零 token 结构化提取, 产物 CrawlResult 再喂给抽取模型。

真实实现(E1-1): Firecrawl / Crawl4AI —— 抓首页/功能/价格/文档/关于 + sitemap + 截图 → 干净 markdown。
"""
from __future__ import annotations

from abc import ABC, abstractmethod

from app.config import Settings
from app.errors import ConfigError
from app.models.schemas import CrawlResult


class Crawler(ABC):
    name: str = "base"

    @abstractmethod
    def crawl(self, url: str) -> CrawlResult: ...


class StubCrawler(Crawler):
    name = "stub"

    def crawl(self, url: str) -> CrawlResult:
        return CrawlResult(
            url=url, reachable=True,
            markdown=f"[stub 抓取占位] {url}",
            note="TODO: 接真实抓取(Firecrawl/Crawl4AI), 见 BACKLOG E1-1",
        )


class FirecrawlCrawler(Crawler):
    name = "firecrawl"

    def crawl(self, url: str) -> CrawlResult:
        raise NotImplementedError("Firecrawl 抓取未实现 —— BACKLOG E1-1")


class Crawl4AICrawler(Crawler):
    name = "crawl4ai"

    def crawl(self, url: str) -> CrawlResult:
        raise NotImplementedError("Crawl4AI 抓取未实现 —— BACKLOG E1-1")


_REGISTRY: dict[str, type[Crawler]] = {
    "stub": StubCrawler, "firecrawl": FirecrawlCrawler, "crawl4ai": Crawl4AICrawler,
}


def make_crawler(settings: Settings) -> Crawler:
    if settings.crawler not in _REGISTRY:
        raise ConfigError(f"未知 crawler: {settings.crawler!r} (可选 {sorted(_REGISTRY)})")
    return _REGISTRY[settings.crawler]()
