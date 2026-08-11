"""网站抓取增强(离线): 结构化数据(ld+json/__NEXT_DATA__) + 中文锚文本发现 + 关键页并发 + SPA 标注。"""
from __future__ import annotations

import os
import sys

from bs4 import BeautifulSoup

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # backend/

from app.providers.crawler import (  # noqa: E402
    _HtmlCrawler, _discover, _looks_like_spa, _structured,
)

HOME = """<html><head><title>Demo</title>
<meta name="description" content="首页meta描述">
<script type="application/ld+json">
{"@type":"SoftwareApplication","name":"记账Demo","description":"一个记账工具","featureList":"多账本 预算"}
</script>
<script id="__NEXT_DATA__" type="application/json">
{"props":{"pageProps":{"tagline":"三秒记一笔","headline":"最好用的记账"}}}
</script></head>
<body><nav><a href="/p/9">定价</a><a href="/docs">Docs</a><a href="/blog">博客</a></nav>
<div id="__next"></div></body></html>"""
PRICE = "<html><body><main>专业版每月10元</main></body></html>"
DOCS = "<html><body><main>安装指南</main></body></html>"


class _FakeCrawler(_HtmlCrawler):
    name = "fake"

    def __init__(self, pages: dict, **kw):
        super().__init__(**kw)
        self._pages = pages

    def _get_html(self, url: str) -> str:
        return self._pages[url]


def test_crawl_harvests_structured_and_concurrent_pages():
    base = "https://demo.test/"
    pages = {base: HOME, "https://demo.test/p/9": PRICE, "https://demo.test/docs": DOCS}
    r = _FakeCrawler(pages).crawl(base)
    assert r.title == "Demo"
    assert "结构化数据" in r.markdown
    assert "一个记账工具" in r.markdown              # ld+json description
    assert "三秒记一笔" in r.markdown                # __NEXT_DATA__ tagline(被 JS 藏起来的文案)
    assert "专业版每月10元" in r.markdown            # 关键页(靠锚文本"定价"发现)被并发抓到
    assert "pricing" in {p.type for p in r.pages}
    assert "疑似SPA" in r.note                        # 静态正文空 + __next 挂载点 → 标注


def test_structured_extracts_ldjson_and_nextdata():
    s = _structured(BeautifulSoup(HOME, "lxml"))
    assert "一个记账工具" in s and "三秒记一笔" in s and "最好用的记账" in s


def test_discover_matches_anchor_text():
    html = '<html><body><a href="/p/9">定价</a><a href="/blog">博客</a></body></html>'
    pages = _discover("https://x.test/", BeautifulSoup(html, "lxml"))
    kinds = {(p.type, p.url) for p in pages}
    assert ("pricing", "https://x.test/p/9") in kinds   # 关键词只在锚文本里也命中
    assert all("blog" not in p.url for p in pages)       # 无关链接不误收


def test_looks_like_spa():
    assert _looks_like_spa(BeautifulSoup('<div id="__next"></div>', "lxml"))
    assert not _looks_like_spa(BeautifulSoup("<div>hello world</div>", "lxml"))
