"""BuiltinCrawler 的 SPA 自动降级(离线): 静态抓到空壳 → 尝试用浏览器渲染重抓;
但无 chrome 时必须优雅保留原 builtin 结果, 绝不报错、绝不真的去起浏览器进程。"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # backend/

from app.providers import crawler as crawler_mod  # noqa: E402
from app.providers.crawler import BuiltinCrawler  # noqa: E402

# 静态正文近乎为空(仅一个 __next 挂载点) + 文案全藏在 __NEXT_DATA__ 里 → 触发 spa 判定
SPA_HOME = """<html><head><title>SPA Demo</title>
<meta name="description" content="一个SPA落地页">
<script id="__NEXT_DATA__" type="application/json">
{"props":{"pageProps":{"tagline":"极速渲染的SPA","headline":"SPA首页"}}}
</script></head>
<body><div id="__next"></div></body></html>"""


class _FakeBuiltinCrawler(BuiltinCrawler):
    """离线版 BuiltinCrawler: 用罐装 HTML 代替真实 httpx 请求(不联网)。"""

    def __init__(self, pages: dict, **kw):
        super().__init__(**kw)
        self._pages = pages

    def _get_html(self, url: str) -> str:
        return self._pages[url]


def test_spa_fallback_gracefully_skips_without_chrome(monkeypatch):
    # 模拟找不到 chrome: 环境里没装浏览器
    monkeypatch.setattr(crawler_mod, "_find_chrome", lambda: "")
    # 保险: 若实现有 bug 真去起浏览器, 让它立刻炸掉而不是挂起/联网
    monkeypatch.setattr(
        crawler_mod, "BrowserCrawler",
        lambda *a, **kw: (_ for _ in ()).throw(AssertionError("不应该尝试浏览器渲染(无 chrome 时应优雅退回)")),
    )

    base = "https://spa.test/"
    c = _FakeBuiltinCrawler({base: SPA_HOME}, spa_fallback=True)
    r = c.crawl(base)                                       # 不应抛异常

    assert r.reachable
    assert "疑似SPA" in r.note                              # 仍标注疑似SPA
    assert "SPA降级" not in r.note                          # 没有真的降级成功(因为没 chrome)
    assert "结构化数据" in r.markdown                        # 结构化数据兜底还在
    assert "极速渲染的SPA" in r.markdown                     # __NEXT_DATA__ 里的文案被捞出来了


def test_spa_fallback_disabled_leaves_note_untouched(monkeypatch):
    # 即便"看起来"能降级(这里不 patch _find_chrome, 用默认探测), 关开关就不该碰浏览器逻辑
    monkeypatch.setattr(
        crawler_mod, "BrowserCrawler",
        lambda *a, **kw: (_ for _ in ()).throw(AssertionError("spa_fallback=False 时不应触碰 BrowserCrawler")),
    )
    base = "https://spa.test/"
    c = _FakeBuiltinCrawler({base: SPA_HOME}, spa_fallback=False)
    r = c.crawl(base)

    assert r.reachable
    assert "疑似SPA" in r.note
    assert "SPA降级" not in r.note
