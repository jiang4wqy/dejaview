"""相似项目搜索的执行端 (recall)。

与 LLM 路由一样做成可插拔: search 模块用 LLM 生成 query, 再交给 SearchClient 去召回。
- MockSearchClient: 返回 canned 候选池, 让流水线跑通。
- 真实实现 (Tavily / Firecrawl / Bing / GitHub 搜索 / 中文社区) 见 docs/TODO.md。
"""
from __future__ import annotations

from typing import Optional

from app.config import Settings
from app.fixtures.mocks import MOCK_CANDIDATES
from app.models.schemas import CandidateRef, CandidateSource


class SearchClient:
    def search(self, query: str, source: Optional[CandidateSource] = None) -> list[CandidateRef]:
        raise NotImplementedError


class MockSearchClient(SearchClient):
    """忽略 query, 返回固定候选池 (打上 query_used 标签)。search 模块负责去重。"""

    def search(self, query: str, source: Optional[CandidateSource] = None) -> list[CandidateRef]:
        out: list[CandidateRef] = []
        for c in MOCK_CANDIDATES:
            if source is not None and c.get("source") != source.value:
                continue
            out.append(CandidateRef(**{**c, "query_used": query}))
        return out


def make_search_client(settings: Settings) -> SearchClient:
    if settings.search_provider == "mock":
        return MockSearchClient()
    # TODO: TavilySearchClient / FirecrawlSearchClient / GitHubSearchClient ...
    raise ValueError(
        f"search_provider={settings.search_provider!r} 尚未实现; 见 docs/TODO.md。"
        " 暂时用 DEJAVIEW_SEARCH=mock。"
    )
