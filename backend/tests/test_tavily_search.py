"""TavilySearchClient(离线单测): monkeypatch httpx.post, 不真的联网。"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # backend/

import pytest  # noqa: E402

from app.errors import SearchError  # noqa: E402
from app.models.schemas import CandidateSource  # noqa: E402
from app.providers import search_client as sc  # noqa: E402


class _FakeResp:
    def __init__(self, data: dict) -> None:
        self._data = data

    def raise_for_status(self) -> None:
        pass

    def json(self) -> dict:
        return self._data


def test_tavily_search_maps_results(monkeypatch):
    monkeypatch.setenv("TAVILY_API_KEY", "fake-key")

    def _fake_post(url, json=None, timeout=None, trust_env=None):
        return _FakeResp({"results": [
            {"title": "Repomix", "url": "https://x/y", "content": "pack codebase for llm"},
        ]})

    monkeypatch.setattr(sc.httpx, "post", _fake_post)

    client = sc.TavilySearchClient()
    out = client.search("x")

    assert len(out) == 1
    cand = out[0]
    assert cand.source == CandidateSource.WEB
    assert cand.name == "Repomix"
    assert cand.url == "https://x/y"


def test_tavily_search_without_key_raises(monkeypatch):
    monkeypatch.delenv("TAVILY_API_KEY", raising=False)
    client = sc.TavilySearchClient()
    with pytest.raises(SearchError):
        client.search("x")
