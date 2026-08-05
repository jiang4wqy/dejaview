"""仓库读取 / repo map 执行端(可插拔)。低 token 仓库理解, 产物 RepoMapResult 喂给抽取模型。

真实实现(E2-1): Aider Repo Map(图排序控 token) / GitIngest / Repomix。
"""
from __future__ import annotations

from abc import ABC, abstractmethod

from app.config import Settings
from app.errors import ConfigError
from app.models.schemas import RepoMapResult


class RepoMapper(ABC):
    name: str = "base"

    @abstractmethod
    def build(self, url: str) -> RepoMapResult: ...


class StubRepoMapper(RepoMapper):
    name = "stub"

    def build(self, url: str) -> RepoMapResult:
        return RepoMapResult(
            url=url, reachable=True,
            map_text=f"[stub repo map 占位] {url}",
            note="TODO: Aider Repo Map / GitIngest, 见 BACKLOG E2-1",
        )


class GitIngestRepoMapper(RepoMapper):
    name = "gitingest"

    def build(self, url: str) -> RepoMapResult:
        raise NotImplementedError("GitIngest repo map 未实现 —— BACKLOG E2-1")


class AiderRepoMapper(RepoMapper):
    name = "aider"

    def build(self, url: str) -> RepoMapResult:
        raise NotImplementedError("Aider repo map 未实现 —— BACKLOG E2-1")


_REGISTRY: dict[str, type[RepoMapper]] = {
    "stub": StubRepoMapper, "gitingest": GitIngestRepoMapper, "aider": AiderRepoMapper,
}


def make_repomapper(settings: Settings) -> RepoMapper:
    if settings.repomap not in _REGISTRY:
        raise ConfigError(f"未知 repomap: {settings.repomap!r} (可选 {sorted(_REGISTRY)})")
    return _REGISTRY[settings.repomap]()
