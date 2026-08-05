"""网站抓取执行端(可插拔)。抓取 = 零 token 结构化提取, 产物 CrawlResult 再喂给抽取模型。

- builtin: 免 key 的内置抓取(httpx + BeautifulSoup + markdownify), 抓首页 + 若干关键页 → markdown
- firecrawl / crawl4ai: 更强的托管/自托管抓取(stub, 见 E1)
"""
from __future__ import annotations

import re
from abc import ABC, abstractmethod
from urllib.parse import urljoin, urlparse

import httpx

from app.config import Settings
from app.errors import ConfigError, CrawlError
from app.logging import get_logger
from app.models.schemas import CrawlResult, KeyPage

_UA = "Mozilla/5.0 (compatible; DejaViewBot/0.1; +https://github.com/jiang4wqy/dejaview)"
# 关键页关键词 -> 类型
_KEYPAGE_HINTS = {
    "pricing": "pricing", "price": "pricing", "plans": "pricing",
    "docs": "docs", "documentation": "docs",
    "about": "about", "features": "features", "feature": "features",
}


class Crawler(ABC):
    name: str = "base"

    @abstractmethod
    def crawl(self, url: str) -> CrawlResult: ...


class StubCrawler(Crawler):
    name = "stub"

    def crawl(self, url: str) -> CrawlResult:
        return CrawlResult(url=url, reachable=True, markdown=f"[stub 抓取占位] {url}",
                           note="stub crawler(未真实抓取)")


class BuiltinCrawler(Crawler):
    """免 key 内置抓取: httpx 抓 HTML → 去噪 → markdownify; 发现并抓关键页。"""
    name = "builtin"

    def __init__(self, max_pages: int = 4, timeout: float = 20.0, max_chars: int = 12000) -> None:
        self._max_pages = max_pages
        self._timeout = timeout
        self._max_chars = max_chars
        self._log = get_logger("crawler.builtin")

    def crawl(self, url: str) -> CrawlResult:
        try:
            from bs4 import BeautifulSoup
            from markdownify import markdownify as md
        except ImportError as e:  # pragma: no cover
            raise CrawlError(f"缺少抓取依赖(pip install beautifulsoup4 lxml markdownify): {e}") from e

        try:
            with httpx.Client(headers={"User-Agent": _UA}, trust_env=True,
                              follow_redirects=True, timeout=self._timeout) as client:
                soup = BeautifulSoup(self._fetch(client, url), "lxml")
                title = soup.title.string.strip() if (soup.title and soup.title.string) else ""
                desc = self._meta_desc(soup)
                # 登录墙启发式: 有密码框 且 页面内容很少(纯登录页), 避免误伤含 token 输入的落地页
                requires_login = (bool(soup.find("input", attrs={"type": "password"}))
                                  and len(soup.get_text(strip=True)) < 800)
                key_pages = self._discover(url, soup)

                parts = [f"# {title}\n\n{desc}\n\n## 首页 ({url})\n{self._to_md(soup, md)}"]
                fetched = [KeyPage(type="home", url=url, title=title)]
                for kp in key_pages[: self._max_pages - 1]:
                    try:
                        psoup = BeautifulSoup(self._fetch(client, kp.url), "lxml")
                        parts.append(f"\n\n## {kp.type} ({kp.url})\n{self._to_md(psoup, md)}")
                        fetched.append(kp)
                    except Exception as e:  # noqa: BLE001
                        self._log.info("关键页抓取失败 %s: %s", kp.url, e)

                markdown = "\n".join(parts)[: self._max_chars]
                self._log.info("builtin crawl %s -> %d 页, %d 字", url, len(fetched), len(markdown))
                return CrawlResult(
                    url=url, reachable=True, requires_login=requires_login,
                    title=title, description=desc, markdown=markdown, pages=fetched,
                    note=f"builtin: 首页 + {len(fetched) - 1} 关键页",
                )
        except CrawlError:
            raise
        except Exception as e:  # noqa: BLE001
            raise CrawlError(f"抓取失败 {url}: {e}") from e

    def _fetch(self, client: httpx.Client, url: str) -> str:
        r = client.get(url)
        r.raise_for_status()
        return r.text

    @staticmethod
    def _meta_desc(soup) -> str:
        for attrs in ({"name": "description"}, {"property": "og:description"}):
            m = soup.find("meta", attrs=attrs)
            if m and m.get("content"):
                return m["content"].strip()
        return ""

    def _to_md(self, soup, md) -> str:
        for tag in soup(["script", "style", "noscript", "svg", "header", "footer", "nav"]):
            tag.decompose()
        body = soup.body or soup
        text = md(str(body), strip=["a", "img"])
        return re.sub(r"\n{3,}", "\n\n", text).strip()[: self._max_chars]

    def _discover(self, base: str, soup) -> list[KeyPage]:
        host = urlparse(base).netloc
        seen: set[str] = set()
        out: list[KeyPage] = []
        for a in soup.find_all("a", href=True):
            href = urljoin(base, a["href"]).split("#")[0]
            if urlparse(href).netloc != host or href in seen:
                continue
            low = href.lower()
            for kw, typ in _KEYPAGE_HINTS.items():
                if kw in low:
                    seen.add(href)
                    out.append(KeyPage(type=typ, url=href))
                    break
        return out


class FirecrawlCrawler(Crawler):
    name = "firecrawl"

    def crawl(self, url: str) -> CrawlResult:
        raise NotImplementedError("Firecrawl 抓取未实现 —— BACKLOG E1(可选增强)")


class Crawl4AICrawler(Crawler):
    name = "crawl4ai"

    def crawl(self, url: str) -> CrawlResult:
        raise NotImplementedError("Crawl4AI 抓取未实现 —— BACKLOG E1(可选增强)")


_REGISTRY: dict[str, type[Crawler]] = {
    "stub": StubCrawler, "builtin": BuiltinCrawler,
    "firecrawl": FirecrawlCrawler, "crawl4ai": Crawl4AICrawler,
}


def make_crawler(settings: Settings) -> Crawler:
    if settings.crawler not in _REGISTRY:
        raise ConfigError(f"未知 crawler: {settings.crawler!r} (可选 {sorted(_REGISTRY)})")
    return _REGISTRY[settings.crawler]()
