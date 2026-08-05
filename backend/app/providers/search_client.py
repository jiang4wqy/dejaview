"""相似项目搜索的执行端(可插拔, recall)。search 模块用 LLM 生成 query, 交给它去召回。

- mock:  固定候选池(离线跑通)
- github: 真实 GitHub 仓库搜索(免费, 可选 token 提额) —— E4-3, 已实现
- tavily: 通用网页搜索(需 key) —— E4-2, stub
"""
from __future__ import annotations

import os
from abc import ABC, abstractmethod
from typing import Optional

import httpx

from app.config import Settings
from app.errors import ConfigError, SearchError
from app.fixtures.mocks import MOCK_CANDIDATES
from app.logging import get_logger
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


class GitHubSearchClient(SearchClient):
    """真实 GitHub 仓库搜索。无 key 也能用(10/分); 设 GITHUB_TOKEN 提到 30/分。"""
    name = "github"
    API = "https://api.github.com/search/repositories"

    def __init__(self, token_env: str = "GITHUB_TOKEN", per_query: int = 5, timeout: float = 15.0) -> None:
        self._token = os.getenv(token_env, "")
        self._per_query = per_query
        self._timeout = timeout
        self._log = get_logger("search.github")

    def search(self, query, source=None):
        headers = {"Accept": "application/vnd.github+json", "User-Agent": "dejaview"}
        if self._token:
            headers["Authorization"] = f"token {self._token}"
        try:
            r = httpx.get(
                self.API,
                params={"q": query, "sort": "stars", "order": "desc", "per_page": self._per_query},
                headers=headers, timeout=self._timeout,
            )
            r.raise_for_status()
            items = r.json().get("items", [])
        except Exception as e:  # noqa: BLE001
            raise SearchError(f"GitHub 搜索失败(query={query!r}): {e}") from e

        out: list[CandidateRef] = []
        for it in items:
            stars = it.get("stargazers_count", 0)
            desc = (it.get("description") or "").strip()
            out.append(CandidateRef(
                name=it.get("full_name", ""),
                url=it.get("html_url", ""),
                source=CandidateSource.GITHUB,
                snippet=f"{desc}  ⭐{stars}".strip(),
                query_used=query,
                why_surfaced=f"GitHub 搜索命中(按 star 排序): {query}",
            ))
        self._log.info("github search %r -> %d 个", query, len(out))
        return out


class TavilySearchClient(SearchClient):
    name = "tavily"

    def search(self, query, source=None):
        raise NotImplementedError("Tavily 搜索未实现 —— BACKLOG E4-2")


def make_search_client(settings: Settings) -> SearchClient:
    p = settings.search_provider
    if p == "mock":
        return MockSearchClient()
    if p == "github":
        return GitHubSearchClient(
            token_env=settings.github_token_env,
            per_query=settings.github_per_query,
            timeout=settings.search_timeout,
        )
    if p == "tavily":
        return TavilySearchClient()
    raise ConfigError(f"未知 search_provider: {p!r} (可选 mock|github|tavily)")
