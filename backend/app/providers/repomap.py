"""仓库读取 / repo map 执行端(可插拔)。低 token 仓库理解, 产物 RepoMapResult 喂给抽取模型。

- builtin: 免 key 的内置实现 —— git clone --depth 1 → 入口探测 + 符号签名 + 语言直方图 + 精简配置,
  全部塞进可配的字符预算(DEJAVIEW_REPOMAP_BUDGET_CHARS)。把预算从"文件名清单"换成"真代码信号"。
- aider / gitingest: 更强的图排序 repo map(stub, 见 E2 增强)
"""
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import tempfile
from abc import ABC, abstractmethod
from collections import Counter

from app.config import Settings
from app.errors import ConfigError, RepoError
from app.logging import get_logger
from app.models.schemas import RepoMapResult
from app.netguard import safe_git_url

_IGNORE_DIRS = {".git", "node_modules", "vendor", "dist", "build", ".next", "out",
                "__pycache__", ".venv", "venv", ".idea", ".vscode", "target", ".cache",
                ".pytest_cache", ".mypy_cache", "coverage", ".turbo"}
_CONFIG_FILES = ["package.json", "pyproject.toml", "requirements.txt", "go.mod",
                 "Cargo.toml", "pom.xml", "composer.json", "Gemfile", "Dockerfile"]
_README_NAMES = ["README.md", "README.rst", "README.txt", "README", "readme.md"]

# 源码目录(排序加分) / 低信号目录(减分, 但不忽略) / 入口文件名(强加分)
_SRC_DIRS = {"src", "lib", "app", "pkg", "cmd", "internal", "core", "backend", "frontend",
             "server", "api", "packages"}
_DEPRIORITIZE = {"test", "tests", "__tests__", "spec", "specs", "example", "examples",
                 "fixture", "fixtures", "mock", "mocks", "docs", "doc", "migrations",
                 "bench", "benchmarks", "e2e", "stories", "storybook", ".github", "public"}
_ENTRY_NAMES = {"index", "main", "app", "server", "cli", "__main__", "manage",
                "wsgi", "asgi", "run", "bootstrap"}
_CODE_EXT = {".py", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".go", ".rs", ".java", ".kt",
             ".rb", ".php", ".c", ".cc", ".cpp", ".h", ".hpp", ".cs", ".swift", ".scala",
             ".vue", ".svelte"}

# 每语言的"签名行"正则(只取声明行, 不取函数体 —— 高信号、低 token)
_SIG = {
    "py": re.compile(r"^\s*(class\s+\w+|(?:async\s+)?def\s+\w+|@(?:app|router|api|bp|blueprint)\.\w+)"),
    "js": re.compile(r"^\s*(export\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|interface|type|enum)\s+\w+"
                     r"|(?:async\s+)?function\s+\w+|class\s+\w+"
                     r"|(?:app|router)\.(?:get|post|put|delete|patch|use)\s*\()"),
    "go": re.compile(r"^\s*(func\s+[\w(]|type\s+\w+)"),
    "rust": re.compile(r"^\s*(?:pub\s+)?(fn\s+\w+|struct\s+\w+|trait\s+\w+|enum\s+\w+|impl\b)"),
    "jvm": re.compile(r"^\s*(?:public|private|protected|internal)?\s*(class|interface|enum|object|fun)\s+\w+"),
    "rb": re.compile(r"^\s*(class|module|def)\s+\w+"),
    "php": re.compile(r"^\s*(?:abstract\s+|final\s+)?(class|function|interface|trait)\s+\w+"),
}
_EXT_LANG = {
    ".py": "py",
    ".ts": "js", ".tsx": "js", ".js": "js", ".jsx": "js", ".mjs": "js",
    ".vue": "js", ".svelte": "js",
    ".go": "go", ".rs": "rust",
    ".java": "jvm", ".kt": "jvm", ".scala": "jvm", ".cs": "jvm",
    ".rb": "rb", ".php": "php",
}


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
    """git clone --depth 1 → 入口探测 + 符号签名 + 语言直方图 + 精简配置。免 key, 预算封顶。"""
    name = "builtin"

    def __init__(self, workdir: str = "/root/autodl-tmp/dejaview/.cache/repos",
                 timeout: int = 120, max_files: int = 2000,
                 budget_chars: int = 12000, signature_files: int = 6,
                 max_readme: int = 3500, max_config: int = 700, per_file_sig: int = 1000) -> None:
        self._workdir = workdir
        self._timeout = timeout
        self._max_files = max_files
        self._budget = budget_chars
        self._sig_files = signature_files
        self._max_readme = max_readme
        self._max_config = max_config
        self._per_file_sig = per_file_sig
        self._log = get_logger("repomap.builtin")
        os.makedirs(self._workdir, exist_ok=True)

    # ---- 对外: clone 再 map ----
    def build(self, url: str) -> RepoMapResult:
        dest = tempfile.mkdtemp(prefix="repo-", dir=self._workdir)
        try:
            self._clone(url, dest)
            result = self._map_dir(dest, url)   # 核心逻辑, 可离线单测(不经网络)
            self._log.info("builtin repomap %s -> %d 文件, map %d 字", url, len(result.tree), len(result.map_text))
            return result
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

    # ---- 核心: 把一个本地目录压成预算内的 repo map(可离线测试) ----
    def _map_dir(self, root: str, url: str) -> RepoMapResult:
        files = self._collect(root)                       # [(rel, abspath, size, ext)]
        langs = self._histogram(files)
        entries = self._entries(root, files)
        ranked = self._rank(files, entries)
        picked = ranked[: self._sig_files]

        readme = self._read_first(root, _README_NAMES, self._max_readme)
        configs = self._configs(root, files)
        signatures = self._signatures(picked)

        map_text = self._render(url, langs, entries, ranked, signatures, configs)
        return RepoMapResult(
            url=url, reachable=True, map_text=map_text,
            tree=[f"{rel} ({size}B)" for rel, _, size, _ in ranked[:120]],
            readme=readme, key_files=[rel for rel, _, _, _ in picked],
            note=f"builtin: {len(files)} 文件, {len(picked)} 签名, {len(map_text)} 字",
        )

    # 遍历文件树(忽略噪声目录), 收集元数据
    def _collect(self, root: str) -> list[tuple[str, str, int, str]]:
        out: list[tuple[str, str, int, str]] = []
        for dirpath, dirnames, filenames in os.walk(root):
            dirnames[:] = sorted(d for d in dirnames if d not in _IGNORE_DIRS)
            rel_dir = os.path.relpath(dirpath, root)
            for fn in sorted(filenames):
                rel = fn if rel_dir == "." else os.path.join(rel_dir, fn)
                ab = os.path.join(dirpath, fn)
                try:
                    size = os.path.getsize(ab)
                except OSError:
                    size = 0
                out.append((rel, ab, size, os.path.splitext(fn)[1].lower()))
                if len(out) >= self._max_files:
                    return out
        return out

    @staticmethod
    def _histogram(files: list[tuple[str, str, int, str]]) -> list[tuple[str, int]]:
        c = Counter(ext for _, _, _, ext in files if ext in _CODE_EXT)
        return c.most_common(8)

    # 入口探测: package.json(main/bin/scripts)、pyproject([project.scripts])、常见入口路径
    def _entries(self, root: str, files: list[tuple[str, str, int, str]]) -> list[str]:
        rels = {rel.replace("\\", "/") for rel, _, _, _ in files}
        found: list[str] = []

        pkg = os.path.join(root, "package.json")
        if os.path.isfile(pkg):
            try:
                data = json.loads(self._read(pkg, 20000) or "{}")
                for v in (data.get("main"), data.get("module")):
                    if isinstance(v, str):
                        found.append(v.lstrip("./"))
                b = data.get("bin")
                found += [x.lstrip("./") for x in (b.values() if isinstance(b, dict) else [b]) if isinstance(x, str)]
            except (json.JSONDecodeError, AttributeError):
                pass

        pp = os.path.join(root, "pyproject.toml")
        if os.path.isfile(pp):
            txt = self._read(pp, 20000)
            # [project.scripts] 的 "name = pkg.module:fn" → pkg/module.py
            for mod in re.findall(r"=\s*[\"']([\w.]+):", txt):
                found.append(mod.replace(".", "/") + ".py")

        # 常见入口路径(存在才算)
        for cand in ("src/index.ts", "src/index.tsx", "src/index.js", "src/main.ts", "src/main.tsx",
                     "src/main.py", "src/main.rs", "src/App.tsx", "app/main.py", "main.py",
                     "__main__.py", "manage.py", "index.js", "index.ts", "main.go", "cmd/main.go",
                     "app.py", "server.py", "server.js", "server.ts", "cli.py"):
            if cand in rels:
                found.append(cand)

        # 去重、只保留确实存在的
        seen: list[str] = []
        for f in found:
            f = f.replace("\\", "/")
            if f in rels and f not in seen:
                seen.append(f)
        return seen

    # 按重要性给源文件打分排序(源码目录+入口+浅层 加分; 测试/示例/生成物 减分)
    def _rank(self, files: list[tuple[str, str, int, str]],
              entries: list[str]) -> list[tuple[str, str, int, str]]:
        entry_set = set(entries)

        def score(item: tuple[str, str, int, str]) -> tuple:
            rel, _, size, ext = item
            parts = rel.replace("\\", "/").split("/")
            base = os.path.splitext(parts[-1])[0].lower()
            s = 0
            if ext not in _CODE_EXT:
                s -= 100                                   # 非代码文件沉底
            if rel.replace("\\", "/") in entry_set:
                s += 50                                     # 明确入口
            if any(p in _SRC_DIRS for p in parts[:-1]):
                s += 8
            if any(p.lower() in _DEPRIORITIZE for p in parts[:-1]):
                s -= 12
            if base in _ENTRY_NAMES:
                s += 6
            if base in {"router", "routes", "api", "handler", "handlers", "models",
                        "model", "schema", "schemas", "service", "services", "core", "pipeline"}:
                s += 4
            s -= len(parts)                                 # 越浅越重要
            if size > 200_000:
                s -= 5                                      # 超大文件(多半是生成物)降权
            return (-s, rel)                                 # 分高在前, 同分按路径稳定排序

        return sorted(files, key=score)

    # 抽签名: 逐文件按语言正则取声明行(取不到就退化成前若干非空行)
    def _signatures(self, picked: list[tuple[str, str, int, str]]) -> list[tuple[str, str]]:
        out: list[tuple[str, str]] = []
        for rel, ab, _, ext in picked:
            if ext not in _CODE_EXT:
                continue
            text = self._read(ab, 60000)
            if not text:
                continue
            lang = _EXT_LANG.get(ext)
            pat = _SIG.get(lang) if lang else None
            lines: list[str] = []
            if pat:
                for ln in text.splitlines():
                    if pat.match(ln):
                        lines.append(ln.rstrip()[:160])
                    if len("\n".join(lines)) >= self._per_file_sig:
                        break
            if not lines:                                   # 无匹配 → 退化到前 20 行非空非注释
                for ln in text.splitlines():
                    st = ln.strip()
                    if st and not st.startswith(("#", "//", "/*", "*")):
                        lines.append(ln.rstrip()[:160])
                    if len(lines) >= 20 or len("\n".join(lines)) >= self._per_file_sig:
                        break
            if lines:
                out.append((rel, "\n".join(lines)[: self._per_file_sig]))
        return out

    # 精简配置: 深度≤2 找配置文件, 按 basename 去重; package.json/pyproject 只留相关字段
    def _configs(self, root: str, files: list[tuple[str, str, int, str]]) -> dict[str, str]:
        wanted = set(_CONFIG_FILES)
        picked: dict[str, str] = {}
        for rel, ab, _, _ in files:
            rel = rel.replace("\\", "/")
            base = rel.split("/")[-1]
            if base in wanted and rel.count("/") <= 2 and base not in picked:
                picked[base] = self._trim_config(base, self._read(ab, 20000))
        return picked

    def _trim_config(self, base: str, text: str) -> str:
        if base == "package.json":
            try:
                d = json.loads(text or "{}")
                slim = {k: d[k] for k in ("name", "description", "scripts", "dependencies",
                                          "peerDependencies", "bin", "main") if k in d}
                return json.dumps(slim, ensure_ascii=False, indent=1)[: self._max_config]
            except json.JSONDecodeError:
                pass
        return (text or "")[: self._max_config]

    # ---- 文件读取 ----
    @staticmethod
    def _read(path: str, limit: int) -> str:
        try:
            with open(path, encoding="utf-8", errors="ignore") as f:
                return f.read(limit)                        # 只读需要的字节, 不整文件读入
        except OSError:
            return ""

    def _read_first(self, root: str, names: list[str], limit: int) -> str:
        for n in names:
            p = os.path.join(root, n)
            if os.path.isfile(p):
                return self._read(p, limit)
        return ""

    # ---- 组装: 各段封顶, 最后整体硬截断到预算 ----
    def _render(self, url: str, langs: list[tuple[str, int]], entries: list[str],
                ranked: list[tuple[str, str, int, str]], signatures: list[tuple[str, str]],
                configs: dict[str, str]) -> str:
        lang_line = " ".join(f"{ext.lstrip('.')}:{n}" for ext, n in langs) or "(未识别)"
        lines = [f"# 仓库: {url}", "", f"## 语言分布(按文件数): {lang_line}"]
        if entries:
            lines += ["", "## 入口文件", *(f"- {e}" for e in entries[:10])]

        # 签名段(最重要, 预算优先给它)
        lines += ["", "## 关键文件符号签名(声明行)"]
        for rel, sig in signatures:
            lines += [f"### {rel}", "```", sig, "```"]

        # 精简文件树(只列高信号前 60)
        lines += ["", "## 高信号文件(前 60)"]
        lines += [f"- {rel} ({size}B)" for rel, _, size, _ in ranked[:60]]

        # 精简配置
        for name, content in configs.items():
            lines += ["", f"## {name}", content]

        return "\n".join(lines)[: self._budget]              # 硬预算上限


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
    if settings.repomap == "builtin":
        return BuiltinRepoMapper(budget_chars=settings.repomap_budget_chars,
                                 signature_files=settings.repomap_signature_files,
                                 max_readme=settings.repomap_max_readme)
    return _REGISTRY[settings.repomap]()
