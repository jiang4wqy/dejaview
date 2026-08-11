"""内置 repo map 增强(离线): 入口探测 / 符号签名 / 语言直方图 / 非根配置 / 预算封顶 / README 不双喂。"""
from __future__ import annotations

import json
import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # backend/

from app.providers.repomap import BuiltinRepoMapper  # noqa: E402


def _write(root: str, rel: str, content: str) -> None:
    p = os.path.join(root, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w", encoding="utf-8") as f:
        f.write(content)


@pytest.fixture
def repo(tmp_path):
    root = os.path.join(str(tmp_path), "repo")
    os.makedirs(root, exist_ok=True)
    _write(root, "package.json", json.dumps({
        "name": "demo", "description": "a demo app", "main": "src/index.ts",
        "scripts": {"build": "tsc"}, "dependencies": {"react": "^18.0.0"}}))
    _write(root, "README.md", "# Demo\n" + "叙述文字 " * 80)
    _write(root, "src/index.ts",
           "export function main() { return 1 }\nexport class Widget {}\napp.get('/x', handler)\n")
    _write(root, "src/util.ts", "export const helper = () => 2\n")
    _write(root, "tests/index.test.ts", "test('x', () => { expect(1).toBe(1) })\n")
    _write(root, "backend/pyproject.toml", "[project]\nname='x'\n[project.scripts]\ncli='pkg.cli:main'\n")
    return root


def _map(root: str, **kw) -> "object":
    m = BuiltinRepoMapper(workdir=os.path.dirname(root), **kw)
    return m._map_dir(root, "https://github.com/demo/demo")


def test_language_histogram_and_entry(repo):
    r = _map(repo)
    assert "语言分布" in r.map_text and "ts:3" in r.map_text        # 3 个 .ts
    assert "入口文件" in r.map_text and "src/index.ts" in r.map_text  # package.json main 探到入口


def test_signatures_include_real_code(repo):
    r = _map(repo)
    assert "符号签名" in r.map_text
    assert "export function main" in r.map_text                      # 抽到真代码声明
    assert "export class Widget" in r.map_text
    assert "src/index.ts" in r.key_files                             # 高信号入口被选中抽签名


def test_tests_dir_deprioritized(repo):
    r = _map(repo)
    # 源码入口排在测试文件之前
    assert r.map_text.index("src/index.ts") < r.map_text.index("tests/index.test.ts")


def test_nonroot_config_discovered_and_trimmed(repo):
    r = _map(repo)
    assert "## package.json" in r.map_text and "react" in r.map_text  # 依赖保留
    assert "## pyproject.toml" in r.map_text                          # 非根(backend/)也发现


def test_readme_not_duplicated_in_maptext(repo):
    r = _map(repo)
    assert "叙述文字" in r.readme                                     # README 走独立字段
    assert "叙述文字" not in r.map_text                               # 不再塞进 map_text(避免双喂)


def test_budget_is_hard_cap(repo):
    r = _map(repo, budget_chars=200)
    assert len(r.map_text) <= 200                                    # 预算是硬上限


def test_signature_fallback_skips_imports(tmp_path):
    root = os.path.join(str(tmp_path), "r")
    os.makedirs(root, exist_ok=True)
    # 只有 import + __main__ 调用、没有 def/class → 走回退分支
    _write(root, "app/boot.py",
           "import os\nimport uvicorn\nfrom app.config import settings\n\n"
           "logger = get_logger(__name__)\n"
           "if __name__ == '__main__':\n    uvicorn.run(settings.app)\n")
    r = _map(root)
    assert "### app/boot.py" in r.map_text
    assert "import uvicorn" not in r.map_text                        # import 行被跳过(低信号)
    assert "from app.config import settings" not in r.map_text
    assert "uvicorn.run" in r.map_text or "if __name__" in r.map_text  # 保留真实入口行
