"""相似项目搜索的执行端(可插拔, recall)。search 模块用 LLM 生成 query, 交给它去召回。

真实实现: Tavily / Firecrawl search / GitHub 搜索 / 中文社区(E4-2~E4-5)。
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Optional

from app.config import Settings
from app.errors import ConfigError
from app.fixtures.mocks import MOCK_CANDIDATES
from app.models.schemas import CandidateRef, CandidateSource


class SearchClient(ABC):
    name: str = "base"

    @abstractmethod
    def search(self, query: str, source: Optional[CandidateSource] = None) -> list[CandidateRef]: ...


class MockSearchClient(SearchClient):
    name = "mock"

    def search(self, query, source=None):
        out: list[CandidateRef] = []
        for c in MOCK_CANDIDATES:
            if source is not None and c.get("source") != source.value:
                continue
            out.append(CandidateRef(**{**c, "query_used": query}))
        return out


class TavilySearchClient(SearchClient):
    name = "tavily"

    def search(self, query, source=None):
        raise NotImplementedError("Tavily 搜索未实现 —— BACKLOG E4-2")


class GitHubSearchClient(SearchClient):
    name = "github"

    def search(self, query, source=None):
        raise NotImplementedError("GitHub 搜索未实现 —— BACKLOG E4-3")


_REGISTRY: dict[str, type[SearchClient]] = {
    "mock": MockSearchClient, "tavily": TavilySearchClient, "github": GitHubSearchClient,
}


def make_search_client(settings: Settings) -> SearchClient:
    if settings.search_provider not in _REGISTRY:
        raise ConfigError(f"未知 search_provider: {settings.search_provider!r} (可选 {sorted(_REGISTRY)})")
    return _REGISTRY[settings.search_provider]()
