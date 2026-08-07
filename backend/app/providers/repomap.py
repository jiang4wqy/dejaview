"""仓库读取 / repo map 执行端(可插拔)。低 token 仓库理解, 产物 RepoMapResult 喂给抽取模型。

- builtin: 免 key 的内置实现 —— git clone --depth 1 → 文件树 + README + 关键配置 → token 预算内的 map
- aider / gitingest: 更强的图排序 repo map(stub, 见 E2 增强)
"""
from __future__ import annotations

import os
import shutil
import subprocess
import tempfile
from abc import ABC, abstractmethod

from app.config import Settings
from app.errors import ConfigError, RepoError
from app.logging import get_logger
from app.models.schemas import RepoMapResult
from app.netguard import safe_git_url

_IGNORE_DIRS = {".git", "node_modules", "vendor", "dist", "build", ".next", "out",
                "__pycache__", ".venv", "venv", ".idea", ".vscode", "target", ".cache"}
_CONFIG_FILES = ["package.json", "pyproject.toml", "requirements.txt", "go.mod",
                 "Cargo.toml", "pom.xml", "composer.json", "Gemfile", "Dockerfile"]
_README_NAMES = ["README.md", "README.rst", "README.txt", "README", "readme.md"]


class RepoMapper(ABC):
    name: str = "base"

    @abstractmethod
    def build(self, url: str) -> RepoMapResult: ...


class StubRepoMapper(RepoMapper):
    name = "stub"

    def build(self, url: str) -> RepoMapResult:
        return RepoMapResult(url=url, reachable=True, map_text=f"[stub repo map] {url}",
                             note="stub repomap(未真实读取)")


class BuiltinRepoMapper(RepoMapper):
    """git clone --depth 1 → 文件树 + README + 关键配置。免 key。"""
    name = "builtin"

    def __init__(self, workdir: str = "/root/autodl-tmp/dejaview/.cache/repos",
                 timeout: int = 120, max_files: int = 400,
                 max_readme: int = 6000, max_config: int = 2000) -> None:
        self._workdir = workdir
        self._timeout = timeout
        self._max_files = max_files
        self._max_readme = max_readme
        self._max_config = max_config
        self._log = get_logger("repomap.builtin")
        os.makedirs(self._workdir, exist_ok=True)

    def build(self, url: str) -> RepoMapResult:
        dest = tempfile.mkdtemp(prefix="repo-", dir=self._workdir)
        try:
            self._clone(url, dest)
            tree = self._walk(dest)
            readme = self._read_first(dest, _README_NAMES, self._max_readme)
            configs = {n: self._read(os.path.join(dest, n), self._max_config)
                       for n in _CONFIG_FILES if os.path.isfile(os.path.join(dest, n))}
            map_text = self._render(url, tree, readme, configs)
            self._log.info("builtin repomap %s -> %d 文件, README %d 字", url, len(tree), len(readme))
            return RepoMapResult(url=url, reachable=True, map_text=map_text,
                                 tree=tree[:200], readme=readme, key_files=list(configs),
                                 note=f"builtin: {len(tree)} 文件")
        except RepoError:
            raise
        except Exception as e:  # noqa: BLE001
            raise RepoError(f"仓库读取失败 {url}: {e}") from e
        finally:
            shutil.rmtree(dest, ignore_errors=True)

    def _clone(self, url: str, dest: str) -> None:
        url = safe_git_url(url)                            # https + 主机白名单, 挡 ext::/file:// RCE
        env = dict(os.environ,
                   GIT_TERMINAL_PROMPT="0",               # 禁止交互式登录卡住
                   GIT_ALLOW_PROTOCOL="https")            # 只允许 https 传输(兜底挡危险传输)
        try:
            # "--" 分隔, 防止 url 以 "-" 开头被当成 git 选项(选项注入)
            subprocess.run(
                ["git", "clone", "--depth", "1", "--quiet", "--", url, dest],
                check=True, capture_output=True, text=True, timeout=self._timeout, env=env,
            )
        except subprocess.CalledProcessError as e:
            raise RepoError(f"git clone 失败: {(e.stderr or '')[:300]}") from e
        except subprocess.TimeoutExpired:
            raise RepoError(f"git clone 超时({self._timeout}s)")

    def _walk(self, root: str) -> list[str]:
        tree: list[str] = []
        for dirpath, dirnames, filenames in os.walk(root):
            dirnames[:] = [d for d in dirnames if d not in _IGNORE_DIRS]
            rel = os.path.relpath(dirpath, root)
            for fn in sorted(filenames):
                path = fn if rel == "." else os.path.join(rel, fn)
                try:
                    size = os.path.getsize(os.path.join(dirpath, fn))
                except OSError:
                    size = 0
                tree.append(f"{path} ({size}B)")
                if len(tree) >= self._max_files:
                    return tree
        return tree

    @staticmethod
    def _read(path: str, limit: int) -> str:
        try:
            with open(path, encoding="utf-8", errors="ignore") as f:
                return f.read()[:limit]
        except OSError:
            return ""

    def _read_first(self, root: str, names: list[str], limit: int) -> str:
        for n in names:
            p = os.path.join(root, n)
            if os.path.isfile(p):
                return self._read(p, limit)
        return ""

    def _render(self, url: str, tree: list[str], readme: str, configs: dict[str, str]) -> str:
        lines = [f"# 仓库: {url}", "", "## 文件树(部分)", *tree[:200], "", "## README", readme]
        for name, content in configs.items():
            lines += ["", f"## {name}", content]
        return "\n".join(lines)


class GitIngestRepoMapper(RepoMapper):
    name = "gitingest"

    def build(self, url: str) -> RepoMapResult:
        raise NotImplementedError("GitIngest repo map 未实现 —— BACKLOG E2(可选增强)")


class AiderRepoMapper(RepoMapper):
    name = "aider"

    def build(self, url: str) -> RepoMapResult:
        raise NotImplementedError("Aider repo map 未实现 —— BACKLOG E2(可选增强)")


_REGISTRY: dict[str, type[RepoMapper]] = {
    "stub": StubRepoMapper, "builtin": BuiltinRepoMapper,
    "gitingest": GitIngestRepoMapper, "aider": AiderRepoMapper,
}


def make_repomapper(settings: Settings) -> RepoMapper:
    if settings.repomap not in _REGISTRY:
        raise ConfigError(f"未知 repomap: {settings.repomap!r} (可选 {sorted(_REGISTRY)})")
    return _REGISTRY[settings.repomap]()
