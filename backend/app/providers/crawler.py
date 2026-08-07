"""网站抓取执行端(可插拔)。抓取 = 零 token 结构化提取, 产物 CrawlResult 再喂给抽取模型。

- builtin:  httpx 抓静态 HTML → 去噪 → markdown(免 key, 默认)
- browser:  headless Chrome(--dump-dom)渲染 JS 后再解析(免 key, 适合 SPA)
- firecrawl: Firecrawl 托管抓取(需 FIRECRAWL_API_KEY)
- stub:     占位(离线)
"""
from __future__ import annotations

import glob
import os
import re
import shutil
import subprocess
from abc import ABC, abstractmethod
from urllib.parse import urljoin, urlparse

import httpx

from app.config import Settings
from app.errors import ConfigError, CrawlError
from app.logging import get_logger
from app.models.schemas import CrawlResult, KeyPage
from app.netguard import assert_public_http_url, next_redirect

_UA = "Mozilla/5.0 (compatible; DejaViewBot/0.1; +https://github.com/jiang4wqy/dejaview)"
_KEYPAGE_HINTS = {
    "pricing": "pricing", "price": "pricing", "plans": "pricing",
    "docs": "docs", "documentation": "docs",
    "about": "about", "features": "features", "feature": "features",
}


# ---------- 共享解析 ----------
def _meta_desc(soup) -> str:
    for attrs in ({"name": "description"}, {"property": "og:description"}):
        m = soup.find("meta", attrs=attrs)
        if m and m.get("content"):
            return m["content"].strip()
    return ""


def _to_md(soup, md, max_chars: int) -> str:
    for tag in soup(["script", "style", "noscript", "svg", "header", "footer", "nav"]):
        tag.decompose()
    text = md(str(soup.body or soup), strip=["a", "img"])
    return re.sub(r"\n{3,}", "\n\n", text).strip()[:max_chars]


def _discover(base: str, soup) -> list[KeyPage]:
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


class Crawler(ABC):
    name: str = "base"

    @abstractmethod
    def crawl(self, url: str) -> CrawlResult: ...


class _HtmlCrawler(Crawler):
    """抓 HTML → 解析的通用流程; 子类只实现 _get_html(如何拿到 HTML)。"""

    def __init__(self, max_pages: int = 4, timeout: float = 20.0, max_chars: int = 12000) -> None:
        self._max_pages = max_pages
        self._timeout = timeout
        self._max_chars = max_chars
        self._log = get_logger(f"crawler.{self.name}")

    def _get_html(self, url: str) -> str:  # 子类实现
        raise NotImplementedError

    def crawl(self, url: str) -> CrawlResult:
        try:
            from bs4 import BeautifulSoup
            from markdownify import markdownify as md
        except ImportError as e:  # pragma: no cover
            raise CrawlError(f"缺少抓取依赖(pip install beautifulsoup4 lxml markdownify): {e}") from e
        try:
            home = BeautifulSoup(self._get_html(url), "lxml")
            title = home.title.string.strip() if (home.title and home.title.string) else ""
            desc = _meta_desc(home)
            requires_login = (bool(home.find("input", attrs={"type": "password"}))
                              and len(home.get_text(strip=True)) < 800)
            key_pages = _discover(url, home)
            parts = [f"# {title}\n\n{desc}\n\n## 首页 ({url})\n{_to_md(home, md, self._max_chars)}"]
            fetched = [KeyPage(type="home", url=url, title=title)]
            for kp in key_pages[: self._max_pages - 1]:
                try:
                    psoup = BeautifulSoup(self._get_html(kp.url), "lxml")
                    parts.append(f"\n\n## {kp.type} ({kp.url})\n{_to_md(psoup, md, self._max_chars)}")
                    fetched.append(kp)
                except Exception as e:  # noqa: BLE001
                    self._log.info("关键页失败 %s: %s", kp.url, e)
            markdown = "\n".join(parts)[: self._max_chars]
            self._log.info("%s crawl %s -> %d 页, %d 字", self.name, url, len(fetched), len(markdown))
            return CrawlResult(url=url, reachable=True, requires_login=requires_login, title=title,
                               description=desc, markdown=markdown, pages=fetched,
                               note=f"{self.name}: 首页 + {len(fetched) - 1} 关键页")
        except CrawlError:
            raise
        except Exception as e:  # noqa: BLE001
            raise CrawlError(f"抓取失败 {url}: {e}") from e


class StubCrawler(Crawler):
    name = "stub"

    def crawl(self, url: str) -> CrawlResult:
        return CrawlResult(url=url, reachable=True, markdown=f"[stub 抓取占位] {url}", note="stub crawler")


class BuiltinCrawler(_HtmlCrawler):
    """免 key: httpx 抓静态 HTML。"""
    name = "builtin"

    def _get_html(self, url: str) -> str:
        assert_public_http_url(url)                       # 防 SSRF：拒本机/内网/元数据
        # 手动跟随重定向，每跳复校，避免"公网→内网"的跳转绕过。
        with httpx.Client(headers={"User-Agent": _UA}, trust_env=True,
                          follow_redirects=False, timeout=self._timeout) as c:
            for _ in range(5):
                r = c.get(url)
                if r.is_redirect and "location" in r.headers:
                    url = next_redirect(str(r.url), r.headers["location"])
                    continue
                r.raise_for_status()
                return r.text
            raise CrawlError(f"重定向过多：{url}")


def _find_chrome() -> str:
    env = os.getenv("DEJAVIEW_CHROME_PATH", "")
    if env and os.path.exists(env):
        return env
    home = os.path.expanduser("~")
    for pat in (f"{home}/.cache/ms-playwright/chromium_headless_shell-*/chrome-linux/headless_shell",
                f"{home}/.cache/ms-playwright/chromium-*/chrome-linux/chrome",
                "/root/autodl-tmp/.cache/puppeteer/chrome/*/chrome-linux64/chrome"):
        for c in sorted(glob.glob(pat)):
            if os.path.exists(c):
                return c
    for name in ("chromium", "chromium-browser", "google-chrome", "google-chrome-stable"):
        w = shutil.which(name)
        if w:
            return w
    return ""


class BrowserCrawler(_HtmlCrawler):
    """免 key: headless Chrome 渲染 JS 后再解析(适合 SPA)。用 --dump-dom 拿渲染后的 DOM。"""
    name = "browser"

    def __init__(self, chrome_path: str = "", budget_ms: int = 8000, **kw) -> None:
        super().__init__(**kw)
        self._chrome = chrome_path or _find_chrome()
        self._budget = budget_ms

    def _get_html(self, url: str) -> str:
        if not self._chrome:
            raise CrawlError("未找到 chrome/chromium(设 DEJAVIEW_CHROME_PATH 或 crawler=builtin)")
        cmd = [self._chrome, "--headless=new", "--no-sandbox", "--disable-gpu",
               "--disable-dev-shm-usage", "--hide-scrollbars",
               f"--virtual-time-budget={self._budget}", "--dump-dom", url]
        try:
            p = subprocess.run(cmd, capture_output=True, text=True, timeout=self._timeout + 20)
        except subprocess.TimeoutExpired:
            raise CrawlError(f"chrome 渲染超时: {url}")
        if not p.stdout:
            raise CrawlError(f"chrome 无输出: {(p.stderr or '')[:160]}")
        return p.stdout


class FirecrawlCrawler(Crawler):
    """Firecrawl 托管抓取(需 FIRECRAWL_API_KEY), 直接拿 markdown。"""
    name = "firecrawl"

    def __init__(self, api_key_env: str = "FIRECRAWL_API_KEY", timeout: int = 60) -> None:
        self._key = os.getenv(api_key_env, "")
        self._timeout = timeout

    def crawl(self, url: str) -> CrawlResult:
        if not self._key:
            raise CrawlError("Firecrawl 需要 FIRECRAWL_API_KEY(或 crawler=browser 免 key 渲染 JS)")
        try:
            r = httpx.post("https://api.firecrawl.dev/v1/scrape",
                           headers={"Authorization": f"Bearer {self._key}"},
                           json={"url": url, "formats": ["markdown"]},
                           timeout=self._timeout, trust_env=True)
            r.raise_for_status()
            data = r.json().get("data", {})
        except Exception as e:  # noqa: BLE001
            raise CrawlError(f"Firecrawl 失败: {e}") from e
        meta = data.get("metadata", {})
        title = meta.get("title", "")
        return CrawlResult(url=url, reachable=True, title=title, description=meta.get("description", ""),
                           markdown=(data.get("markdown") or "")[:12000],
                           pages=[KeyPage(type="home", url=url, title=title)], note="firecrawl")


class Crawl4AICrawler(Crawler):
    name = "crawl4ai"

    def crawl(self, url: str) -> CrawlResult:
        raise NotImplementedError("Crawl4AI 未实现 —— crawler=browser 已覆盖 JS 场景")


def make_crawler(settings: Settings) -> Crawler:
    c = settings.crawler
    if c == "stub":
        return StubCrawler()
    if c == "builtin":
        return BuiltinCrawler(timeout=settings.crawl_timeout)
    if c == "browser":
        return BrowserCrawler(chrome_path=settings.chrome_path, timeout=settings.crawl_timeout)
    if c == "firecrawl":
        return FirecrawlCrawler(api_key_env=settings.firecrawl_api_key_env)
    if c == "crawl4ai":
        return Crawl4AICrawler()
    raise ConfigError(f"未知 crawler: {c!r} (可选 stub|builtin|browser|firecrawl|crawl4ai)")
