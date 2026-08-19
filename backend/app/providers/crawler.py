"""网站抓取执行端(可插拔)。抓取 = 零 token 结构化提取, 产物 CrawlResult 再喂给抽取模型。

- builtin:  httpx 抓静态 HTML → 去噪 → markdown(免 key, 默认)
- browser:  headless Chrome(--dump-dom)渲染 JS 后再解析(免 key, 适合 SPA)
- firecrawl: Firecrawl 托管抓取(需 FIRECRAWL_API_KEY)
- stub:     占位(离线)
"""
from __future__ import annotations

import glob
import json
import os
import re
import shutil
import subprocess
from abc import ABC, abstractmethod
from concurrent.futures import ThreadPoolExecutor
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
    "定价": "pricing", "价格": "pricing", "收费": "pricing", "套餐": "pricing",
    "docs": "docs", "documentation": "docs", "文档": "docs", "帮助": "docs", "手册": "docs",
    "about": "about", "关于": "about",
    "features": "features", "feature": "features", "功能": "features", "特性": "features",
}

# 结构化文案的高信号字段(ld+json / 框架 state blob 里挑这些 key 的字符串值)
_STRUCT_KEYS = {"title", "description", "headline", "subheadline", "subtitle", "tagline",
                "slogan", "summary", "name", "metadescription", "ogdescription",
                "seotitle", "seodescription", "featurelist", "abstract"}


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


def _json_strings(obj, keys: set, out: list, cap: int) -> None:
    """从任意嵌套 JSON 里收集白名单 key 的字符串值(去重在外层做; 数量到 cap 即停)。"""
    if len(out) >= cap:
        return
    if isinstance(obj, dict):
        for k, v in obj.items():
            if isinstance(v, str) and k.lower().replace("_", "") in keys and 4 <= len(v) <= 300:
                out.append(v.strip())
            else:
                _json_strings(v, keys, out, cap)
    elif isinstance(obj, list):
        for v in obj:
            _json_strings(v, keys, out, cap)


def _structured(soup, limit: int = 2000) -> str:
    """抓页面里被 JS 藏起来的结构化文案(ld+json / __NEXT_DATA__ 等 state blob)。

    必须在 _to_md 删 script **之前**调用。现代落地页正文常靠 JS 渲染, 静态 HTML 近乎空壳,
    但产品文案往往就藏在这些 JSON 里 —— 捞出来就有信号, 且体积可控(默认 2000 字封顶)。
    """
    picked: list = []
    # 1) JSON-LD: 结构清晰, 直接挑高信号字段
    for tag in soup.find_all("script", attrs={"type": "application/ld+json"}):
        try:
            _json_strings(json.loads(tag.string or tag.get_text() or ""), _STRUCT_KEYS, picked, 40)
        except (json.JSONDecodeError, TypeError):
            continue
    # 2) 框架 state blob: __NEXT_DATA__(纯 JSON) + __NUXT__/__INITIAL_STATE__(best-effort)
    for tag in soup.find_all("script"):
        txt = tag.string or tag.get_text() or ""
        if len(txt) > 200_000:                            # 跳过超大 blob(省时间)
            continue
        blob = ""
        if (tag.get("id") or "").lower() == "__next_data__":
            blob = txt
        elif "__nuxt__" in txt.lower() or "__initial_state__" in txt.lower():
            m = re.search(r"=\s*(\{.*\})\s*;?\s*$", txt.strip(), re.S)
            blob = m.group(1) if m else ""
        if blob:
            try:
                _json_strings(json.loads(blob), _STRUCT_KEYS, picked, 40)
            except json.JSONDecodeError:
                pass
    seen, out = set(), []
    for s in picked:
        if s and s not in seen:
            seen.add(s)
            out.append(s)
    return "\n".join(f"- {s}" for s in out)[:limit]


def _looks_like_spa(soup) -> bool:
    """静态正文近乎为空时, 判断是否 JS 渲染的单页应用(有挂载点 / 框架 data)。"""
    if soup.find("script", attrs={"id": "__NEXT_DATA__"}):
        return True
    return any(soup.find(attrs={"id": rid}) for rid in ("root", "__next", "app", "___gatsby"))


def _discover(base: str, soup) -> list[KeyPage]:
    host = urlparse(base).netloc
    seen: set[str] = set()
    out: list[KeyPage] = []
    for a in soup.find_all("a", href=True):
        href = urljoin(base, a["href"]).split("#")[0]
        if urlparse(href).netloc != host or href in seen:
            continue
        # URL 与**锚文本**一起匹配 —— <a href="/p/9">定价</a> 这种(关键词只在文字里)也能命中
        hay = href.lower() + " " + a.get_text(" ", strip=True).lower()
        for kw, typ in _KEYPAGE_HINTS.items():
            if kw in hay:
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
            key_pages = _discover(url, home)                  # 用整棵 DOM(含 nav)发现关键页
            structured = _structured(home)                    # 删 script 前, 先捞 ld+json / __NEXT_DATA__ 里的文案
            home_md = _to_md(home, md, self._max_chars)       # 此步会删 script/nav, 必须在上面几步之后
            spa = len(home_md) < 200 and _looks_like_spa(home)
            head = f"# {title}\n\n{desc}"
            if structured:
                head += f"\n\n## 结构化数据(页面内嵌)\n{structured}"
            parts = [f"{head}\n\n## 首页 ({url})\n{home_md or '(静态 HTML 正文近乎为空)'}"]
            fetched = [KeyPage(type="home", url=url, title=title)]
            targets = key_pages[: self._max_pages - 1]
            if targets:                                       # 关键页并发抓取, 砍延迟(顺序保留)
                with ThreadPoolExecutor(max_workers=min(4, len(targets))) as ex:
                    for kp, text in ex.map(self._fetch_page, targets):
                        if text is not None:
                            parts.append(f"\n\n## {kp.type} ({kp.url})\n{text}")
                            fetched.append(kp)
            markdown = "\n".join(parts)[: self._max_chars]
            note = f"{self.name}: 首页 + {len(fetched) - 1} 关键页" + ("; 疑似SPA(静态正文少,靠结构化数据)" if spa else "")
            self._log.info("%s crawl %s -> %d 页, %d 字%s", self.name, url, len(fetched),
                           len(markdown), " [SPA]" if spa else "")
            return CrawlResult(url=url, reachable=True, requires_login=requires_login, title=title,
                               description=desc, markdown=markdown, pages=fetched, note=note)
        except CrawlError:
            raise
        except Exception as e:  # noqa: BLE001
            raise CrawlError(f"抓取失败 {url}: {e}") from e

    def _fetch_page(self, kp: KeyPage) -> "tuple[KeyPage, str | None]":
        """抓一个关键页 → (kp, markdown); 失败返回 (kp, None)。供 ThreadPoolExecutor 并发调用。"""
        try:
            from bs4 import BeautifulSoup
            from markdownify import markdownify as md
            psoup = BeautifulSoup(self._get_html(kp.url), "lxml")
            return kp, _to_md(psoup, md, self._max_chars)
        except Exception as e:  # noqa: BLE001
            self._log.info("关键页失败 %s: %s", kp.url, e)
            return kp, None


class StubCrawler(Crawler):
    name = "stub"

    def crawl(self, url: str) -> CrawlResult:
        return CrawlResult(url=url, reachable=True, markdown=f"[stub 抓取占位] {url}", note="stub crawler")


class BuiltinCrawler(_HtmlCrawler):
    """免 key: httpx 抓静态 HTML。命中 SPA(见 crawl())时可选自动切浏览器渲染重抓。"""
    name = "builtin"

    def __init__(self, spa_fallback: bool = False, **kw) -> None:
        super().__init__(**kw)
        self._spa_fallback = spa_fallback

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

    def crawl(self, url: str) -> CrawlResult:
        result = super().crawl(url)
        if not (self._spa_fallback and "疑似SPA" in result.note):
            return result                                  # 关关 / 非SPA: 原样返回
        chrome = _find_chrome()
        if not chrome:                                     # 没装 chrome: 优雅保留 builtin 结果
            self._log.info("疑似SPA 但未找到 chrome, 保留 builtin 结果: %s", url)
            return result
        try:                                                # 等价于 BrowserCrawler 的抓取, 用渲染后的富内容替换
            rendered = BrowserCrawler(chrome_path=chrome, timeout=self._timeout,
                                      max_pages=self._max_pages, max_chars=self._max_chars).crawl(url)
        except Exception as e:  # noqa: BLE001, 渲染失败也绝不报错, 保留原 builtin 结果
            self._log.info("SPA 降级抓取失败, 保留 builtin 结果 %s: %s", url, e)
            return result
        rendered.note = f"{rendered.note}(SPA降级: builtin静态抓空壳, 已用浏览器渲染重抓)"
        return rendered


def _find_chrome() -> str:
    env = os.getenv("DEJAVIEW_CHROME_PATH", "")
    if env and os.path.exists(env):
        return env
    home = os.path.expanduser("~")
    patterns = [
        f"{home}/.cache/ms-playwright/chromium_headless_shell-*/chrome-linux/headless_shell",
        f"{home}/.cache/ms-playwright/chromium-*/chrome-linux/chrome",
    ]
    # puppeteer installs under $PUPPETEER_CACHE_DIR (defaults to ~/.cache/puppeteer) —
    # honour the env var instead of hard-coding one machine's data disk.
    for cache in (os.getenv("PUPPETEER_CACHE_DIR"), os.path.join(home, ".cache", "puppeteer")):
        if not cache:
            continue
        patterns.append(f"{cache}/chrome/*/chrome-linux64/chrome")
        patterns.append(f"{cache}/chrome-headless-shell/*/chrome-headless-shell-linux64/chrome-headless-shell")
    for pat in patterns:
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
        return BuiltinCrawler(timeout=settings.crawl_timeout, spa_fallback=settings.crawler_spa_fallback)
    if c == "browser":
        return BrowserCrawler(chrome_path=settings.chrome_path, timeout=settings.crawl_timeout)
    if c == "firecrawl":
        return FirecrawlCrawler(api_key_env=settings.firecrawl_api_key_env)
    if c == "crawl4ai":
        return Crawl4AICrawler()
    raise ConfigError(f"未知 crawler: {c!r} (可选 stub|builtin|browser|firecrawl|crawl4ai)")
