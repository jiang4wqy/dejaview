"""search 相关性重排/过滤(离线): 丢掉与指纹零重叠的候选(SEO 垃圾), 相关的排前面给 verify 深读。"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # backend/

from app.models.schemas import CandidateRef, CandidateSource, ProjectFingerprint  # noqa: E402
from app.pipeline.search import _fingerprint_terms, _rank  # noqa: E402


class _Svc:
    class _Log:
        def info(self, *a, **k):
            pass

        def warning(self, *a, **k):
            pass

    log = _Log()


def _fp() -> ProjectFingerprint:
    return ProjectFingerprint(
        one_liner="将 Git 仓库转成适合 LLM 的文本摘要",
        target_users="使用 LLM 的开发者",
        problem="把 codebase 喂给 LLM",
        functional_signature="接收 git repository URL, 输出 codebase 的 text digest 给 llm prompt",
        core_features=["repository to text", "token count"],
    )


def _c(name: str, snippet: str, stars: int) -> CandidateRef:
    return CandidateRef(name=name, url=f"https://github.com/{name}",
                        source=CandidateSource.GITHUB, snippet=snippet, stars=stars)


def test_rank_drops_offdomain_and_orders_by_relevance():
    cands = [
        _c("cirosantilli/china-dictatorship", "Chinese communist party censorship, human rights", 12000),
        _c("yamadashy/repomix", "Pack your codebase into text for LLM", 9000),
        _c("mufeedvh/code2prompt", "Convert a codebase into an LLM prompt with token count", 3000),
    ]
    ranked = _rank(_fp(), cands, _Svc())
    names = [c.name for c in ranked]
    assert "cirosantilli/china-dictatorship" not in names   # 零重叠(政治宣传) → 过滤
    assert len(ranked) == 2
    assert names[0] == "mufeedvh/code2prompt"               # 重叠最多(codebase/llm/prompt/token) → 最前


def test_rank_keeps_pool_when_all_zero_overlap():
    cands = [_c("x/y", "totally unrelated censorship page", 100)]
    assert len(_rank(_fp(), cands, _Svc())) == 1            # 全零重叠 → 退回原池, 不空手


def test_fingerprint_terms_bilingual():
    terms = _fingerprint_terms(_fp())
    assert "codebase" in terms and "llm" in terms and "repository" in terms
