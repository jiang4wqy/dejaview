"""内置 crawler / repomap + JSON 修复工具的测试。联网测试用 DEJAVIEW_LIVE_TESTS=1 打开。"""
from __future__ import annotations

import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # backend/

from app.config import Settings  # noqa: E402
from app.errors import CrawlError, RepoError  # noqa: E402
from app.providers.crawler import make_crawler  # noqa: E402
from app.providers.openai_compatible import _strip_fences  # noqa: E402
from app.providers.repomap import make_repomapper  # noqa: E402

LIVE = os.getenv("DEJAVIEW_LIVE_TESTS") == "1"


def test_builtin_registered():
    assert make_crawler(Settings(crawler="builtin")).name == "builtin"
    assert make_repomapper(Settings(repomap="builtin")).name == "builtin"


def test_strip_fences():
    assert _strip_fences('```json\n{"a": 1}\n```') == '{"a": 1}'
    assert _strip_fences('```\n{"a": 1}\n```') == '{"a": 1}'
    assert _strip_fences('{"a": 1}') == '{"a": 1}'


@pytest.mark.skipif(not LIVE, reason="设 DEJAVIEW_LIVE_TESTS=1 跑联网测试")
def test_builtin_crawler_live():
    from app.providers.crawler import BuiltinCrawler
    try:
        r = BuiltinCrawler().crawl("https://example.com")
    except CrawlError as e:
        pytest.skip(f"网络: {e}")
    assert r.reachable and r.title and len(r.markdown) > 20


@pytest.mark.skipif(not LIVE, reason="设 DEJAVIEW_LIVE_TESTS=1 跑联网测试")
def test_builtin_repomap_live():
    from app.providers.repomap import BuiltinRepoMapper
    try:
        r = BuiltinRepoMapper().build("https://github.com/octocat/Hello-World")
    except RepoError as e:
        pytest.skip(f"网络: {e}")
    assert r.reachable and len(r.tree) >= 1
