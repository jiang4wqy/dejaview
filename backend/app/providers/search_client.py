"""相似项目搜索的执行端(可插拔, recall)。search 模块用 LLM 生成 query, 交给它去召回。

单源:
- mock:   固定候选池(离线)
- github: 真实 GitHub 仓库搜索(免 key, 已验证)
- v2ex:   V2EX 社区(经 sov2ex 搜索 API), 找中文讨论/替代品
- juejin: 掘金社区(非官方搜索 API, best-effort)
- tavily: 通用网页搜索(需 key, stub)
多源:
- composite: 合并上面多个(DEJAVIEW_SEARCH_SOURCES=github,v2ex,...), 单源失败不影响其它
"""
from __future__ import annotations

import os
import re
from abc import ABC, abstractmethod
from typing import Optional

import httpx

from app.config import Settings
from app.errors import ConfigError, SearchError
from app.fixtures.mocks import MOCK_CANDIDATES
from app.logging import get_logger
from app.models.schemas import CandidateRef, CandidateSource

_UA = "Mozilla/5.0 (compatible; DejaViewBot/0.1)"

# GitHub 仓库搜索是"所有词都要出现(AND)"—— 词越多命中越少, fingerprint 生成的长自然
# 语言 query 几乎必然 0 结果。这些是对检索没有区分度、只会缩小结果集的填充词。
_STOP = {
    "the", "a", "an", "for", "and", "or", "of", "to", "in", "on", "with", "without",
    "by", "your", "you", "that", "this", "is", "are", "be", "as", "at", "it", "its",
    "from", "using", "use", "used", "via", "no", "not", "free", "friendly", "based",
    "which", "who", "them", "their", "conscious", "owners", "side", "app", "tool",
    "的", "和", "与", "及", "了", "个", "不", "可", "来", "做", "用", "把", "被", "让", "给", "在",
}


def keywordize(query: str, max_words: int) -> str:
    """把长 query 压成 GitHub 能命中的关键词(去填充词, 保留前 max_words 个高信号词)。"""
    kept: list[str] = []
    for t in re.split(r"[\s,，。、/|]+", query.strip()):
        t = t.strip("()（）\"'`：:").lower()
        if not t or t in _STOP:
            continue
        kept.append(t)
        if len(kept) >= max_words:
            break
    return " ".join(kept) if kept else query.strip()


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

    def __init__(self, token_env="GITHUB_TOKEN", per_query=5, timeout=15.0):
        self._token = os.getenv(token_env, "")
        self._per_query = per_query
        self._timeout = timeout
        self._log = get_logger("search.github")

    def _fetch(self, q: str, headers: dict) -> list[dict]:
        try:
            r = httpx.get(self.API, params={"q": q, "sort": "stars", "order": "desc",
                          "per_page": self._per_query}, headers=headers,
                          timeout=self._timeout, trust_env=True)
            r.raise_for_status()
            return r.json().get("items", [])
        except Exception as e:  # noqa: BLE001
            raise SearchError(f"GitHub 搜索失败(q={q!r}): {e}") from e

    def search(self, query, source=None):
        headers = {"Accept": "application/vnd.github+json", "User-Agent": _UA}
        if self._token:
            headers["Authorization"] = f"token {self._token}"
        # 长 query 先收窄到 top-4 关键词; 若为空(AND 太严)再放宽到 top-2 试一次。
        q = keywordize(query, 4)
        items = self._fetch(q, headers)
        if not items:
            wide = keywordize(query, 2)
            if wide and wide != q:
                items = self._fetch(wide, headers)
                if items:
                    q = wide
        out = []
        for it in items:
            desc = (it.get("description") or "").strip()
            out.append(CandidateRef(
                name=it.get("full_name", ""), url=it.get("html_url", ""),
                source=CandidateSource.GITHUB,
                snippet=f"{desc}  ⭐{it.get('stargazers_count', 0)}".strip(),
                query_used=query, why_surfaced=f"GitHub 搜索命中(按 star, 关键词: {q})"))
        self._log.info("github %r (kw=%r) -> %d", query, q, len(out))
        return out


class V2exSearchClient(SearchClient):
    """V2EX 社区搜索(经第三方 sov2ex 全文搜索 API)。找中文讨论 / 替代品 / 吐槽。"""
    name = "v2ex"
    API = "https://www.sov2ex.com/api/search"

    def __init__(self, per_query=5, timeout=15.0):
        self._per_query = per_query
        self._timeout = timeout
        self._log = get_logger("search.v2ex")

    def search(self, query, source=None):
        try:
            r = httpx.get(self.API, params={"q": query, "size": self._per_query, "sort": "sumup"},
                          headers={"User-Agent": _UA}, timeout=self._timeout, trust_env=True)
            r.raise_for_status()
            hits = r.json().get("hits", [])
        except Exception as e:  # noqa: BLE001
            raise SearchError(f"V2EX(sov2ex) 搜索失败(query={query!r}): {e}") from e
        out = []
        for h in hits:
            src = h.get("_source", {})
            tid = src.get("id")
            out.append(CandidateRef(
                name=(src.get("title") or "")[:80],
                url=f"https://www.v2ex.com/t/{tid}" if tid else "https://www.v2ex.com",
                source=CandidateSource.CN_COMMUNITY,
                snippet=(src.get("content") or "")[:160],
                query_used=query, why_surfaced=f"V2EX 讨论命中: {query}"))
        self._log.info("v2ex %r -> %d", query, len(out))
        return out


class JuejinSearchClient(SearchClient):
    """掘金社区搜索(非官方搜索 API, best-effort; 失败即优雅降级)。"""
    name = "juejin"
    API = "https://api.juejin.cn/search_api/v1/search"

    def __init__(self, per_query=5, timeout=15.0):
        self._per_query = per_query
        self._timeout = timeout
        self._log = get_logger("search.juejin")

    def search(self, query, source=None):
        try:
            r = httpx.get(self.API, params={"query": query, "id_type": "0", "cursor": "0",
                          "limit": self._per_query, "search_type": "0", "aid": "2608", "spider": "0"},
                          headers={"User-Agent": _UA}, timeout=self._timeout, trust_env=True)
            r.raise_for_status()
            items = r.json().get("data") or []
        except Exception as e:  # noqa: BLE001
            raise SearchError(f"掘金搜索失败(query={query!r}): {e}") from e
        out = []
        for it in items:
            doc = it.get("result_model", it)
            info = doc.get("article_info") or doc.get("entry") or {}
            title = info.get("title") or doc.get("title") or ""
            if not title:
                continue
            aid = info.get("article_id") or doc.get("article_id") or ""
            out.append(CandidateRef(
                name=title[:80],
                url=f"https://juejin.cn/post/{aid}" if aid else "https://juejin.cn",
                source=CandidateSource.CN_COMMUNITY,
                snippet=(info.get("brief_content") or "")[:160],
                query_used=query, why_surfaced=f"掘金文章命中: {query}"))
        self._log.info("juejin %r -> %d", query, len(out))
        return out


class TavilySearchClient(SearchClient):
    name = "tavily"

    def search(self, query, source=None):
        raise NotImplementedError("Tavily 搜索未实现 —— BACKLOG E4-2")


class CompositeSearchClient(SearchClient):
    """合并多个子源; 单源失败不影响其它(去重在 search.find 里做)。"""
    name = "composite"

    def __init__(self, clients: list[SearchClient]):
        self._clients = clients
        self._log = get_logger("search.composite")

    def search(self, query, source=None):
        out: list[CandidateRef] = []
        for c in self._clients:
            try:
                out.extend(c.search(query, source))
            except SearchError as e:
                self._log.warning("子源 %s 失败, 跳过: %s", c.name, e)
        return out


_SINGLE = {
    "mock": lambda s: MockSearchClient(),
    "github": lambda s: GitHubSearchClient(s.github_token_env, s.github_per_query, s.search_timeout),
    "v2ex": lambda s: V2exSearchClient(s.github_per_query, s.search_timeout),
    "juejin": lambda s: JuejinSearchClient(s.github_per_query, s.search_timeout),
    "tavily": lambda s: TavilySearchClient(),
}


def _build_one(name: str, settings: Settings) -> SearchClient:
    if name not in _SINGLE:
        raise ConfigError(f"未知 search 源: {name!r} (可选 {sorted(_SINGLE)})")
    return _SINGLE[name](settings)


def make_search_client(settings: Settings) -> SearchClient:
    if settings.search_provider == "composite":
        names = [n.strip() for n in settings.search_sources.split(",") if n.strip()]
        if not names:
            raise ConfigError("composite 需要 DEJAVIEW_SEARCH_SOURCES(逗号分隔)")
        return CompositeSearchClient([_build_one(n, settings) for n in names])
    return _build_one(settings.search_provider, settings)
