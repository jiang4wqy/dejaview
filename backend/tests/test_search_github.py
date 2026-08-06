"""GitHub 真实搜索测试。

默认只跑离线单测; 联网测试用 DEJAVIEW_LIVE_TESTS=1 打开:
    DEJAVIEW_LIVE_TESTS=1 ./.venv/bin/python -m pytest tests/test_search_github.py -q
"""
from __future__ import annotations

import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # backend/

from app.config import Settings  # noqa: E402
from app.errors import SearchError  # noqa: E402
from app.models.schemas import CandidateSource  # noqa: E402
from app.providers.search_client import GitHubSearchClient, make_search_client  # noqa: E402

LIVE = os.getenv("DEJAVIEW_LIVE_TESTS") == "1"


def test_make_github_client():
    c = make_search_client(Settings(search_provider="github"))
    assert c.name == "github"


def test_keywordize_shrinks_long_query():
    """GitHub 仓库搜索是 AND, 长自然语言 query 会 0 命中 —— 收窄到高信号关键词。"""
    from app.providers.search_client import keywordize
    q = "privacy friendly web analytics cookieless server side tracking for privacy conscious site owners"
    kw4 = keywordize(q, 4)
    assert kw4 == "privacy web analytics cookieless"   # 去填充词(friendly/for/side/conscious/owners), 取前 4
    assert keywordize(q, 2) == "privacy web"           # 放宽兜底更短
    assert keywordize("", 4) == ""                     # 空 query 不炸
    assert keywordize("Umami", 4) == "umami"           # 单词原样(小写)


@pytest.mark.skipif(not LIVE, reason="设 DEJAVIEW_LIVE_TESTS=1 跑联网测试")
def test_github_search_live():
    client = GitHubSearchClient(per_query=3)
    try:
        results = client.search("AI website roast tool")
    except SearchError as e:
        pytest.skip(f"跳过(网络/限流): {e}")
    assert isinstance(results, list)
    if results:
        r = results[0]
        assert r.url.startswith("http")
        assert r.source is CandidateSource.GITHUB
        assert r.name          # full_name 非空


def test_composite_and_registry():
    from app.errors import ConfigError
    c = make_search_client(Settings(search_provider="composite", search_sources="github,v2ex"))
    assert c.name == "composite"
    for name in ("v2ex", "juejin"):
        assert make_search_client(Settings(search_provider=name)).name == name
    with pytest.raises(ConfigError):
        make_search_client(Settings(search_provider="nope"))


@pytest.mark.skipif(not LIVE, reason="设 DEJAVIEW_LIVE_TESTS=1 跑联网测试")
def test_v2ex_live():
    from app.errors import SearchError
    from app.providers.search_client import V2exSearchClient
    try:
        res = V2exSearchClient(per_query=3).search("mind map")
    except SearchError as e:
        pytest.skip(f"网络: {e}")
    assert isinstance(res, list)
