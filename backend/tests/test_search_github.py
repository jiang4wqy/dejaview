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
