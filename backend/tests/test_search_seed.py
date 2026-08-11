"""search 确定性种子 query(离线): 不联网、不调 LLM, 只测纯函数 _seed_queries。"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # backend/

from app.models.schemas import ProjectFingerprint  # noqa: E402
from app.pipeline.search import _seed_queries  # noqa: E402


def _fp() -> ProjectFingerprint:
    return ProjectFingerprint(
        one_liner="将 Git 仓库转成适合 LLM 的文本摘要",
        problem="把 codebase 喂给 LLM",
        functional_signature="接收 git repository url 输出 codebase 的 text digest 给 llm prompt",
        core_features=["repository to text", "token count"],
    )


def test_seed_queries_nonempty_and_deterministic():
    seeds = _seed_queries(_fp())
    assert seeds                                    # 非空
    assert len(seeds) == len(set(seeds))             # 去重
    assert _seed_queries(_fp()) == seeds             # 同输入同输出(确定性, 不依赖 set 迭代顺序)


def test_seed_queries_cover_signal_words():
    seeds = _seed_queries(_fp())
    assert any("codebase" in s or "llm" in s for s in seeds)


def test_seed_queries_empty_fingerprint_returns_empty():
    assert _seed_queries(ProjectFingerprint()) == []   # 空指纹不空指望, 老实返回空列表
