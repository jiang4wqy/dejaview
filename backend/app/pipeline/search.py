"""search —— 根据项目指纹生成多组 query, 召回相似项目候选(只召回, 不下结论)。

基于功能签名生成多组查询, 执行端(svc.search)可插拔。search 模块负责去重。
"""
from __future__ import annotations

import math
import re

from pydantic import BaseModel, Field

from app import prompts
from app.errors import SearchError
from app.models.schemas import CandidateRef, ProjectFingerprint
from app.providers.llm_router import ModelTier
from app.providers.search_client import _STOP
from app.services import Services


class QuerySet(BaseModel):
    queries: list[str] = Field(default_factory=list)


_SPLIT = re.compile(r"[\s,，。、/|_\-.:()（）\"'`⭐]+")


def _norm(tok: str) -> str:
    """轻量词形归一: repo(s)→repository; 复数去尾 s。缓解 repo/repos、prompts/prompt 这类漏配。"""
    if tok in ("repo", "repos"):
        return "repository"
    return tok[:-1] if len(tok) > 3 and tok.endswith("s") else tok


def _tokens(text: str) -> set[str]:
    return {_norm(t) for t in _SPLIT.split((text or "").lower()) if len(t) >= 2 and t not in _STOP}


def _fingerprint_terms(fp: ProjectFingerprint) -> set[str]:
    bag = " ".join([fp.one_liner, fp.target_users, fp.problem, fp.functional_signature,
                    " ".join(fp.core_features), " ".join(fp.claimed_novelty)])
    return _tokens(bag)


def _rank(fp: ProjectFingerprint, cands: list[CandidateRef], svc: Services) -> list[CandidateRef]:
    """确定性相关性重排 + 过滤(零 LLM 开销)。

    GitHub 按 star 降序返回, 高星 SEO 垃圾仓(如 china-dictatorship)会挤掉真竞品, 而 verify 只深读前 N。
    按 '候选文本 × 指纹词' 的重叠度重排, 丢掉零重叠的候选; 分数按 √token数 归一化 ——
    否则啰嗦文本(如某工具的长 help、混入的 JS)会靠蒙中通用词虚高, 挤掉简洁的真竞品。
    """
    terms = _fingerprint_terms(fp)
    if not terms:
        return cands                                       # 没指纹词就不动(保守)
    scored = []
    for c in cands:
        toks = _tokens(f"{c.name} {c.snippet}")
        ov = len(toks & terms)
        score = ov / math.sqrt(len(toks)) if toks else 0.0   # 长度归一化: 惩罚啰嗦噪声
        scored.append((ov, score, c.stars or 0, c))
    scored.sort(key=lambda x: (-x[1], -x[2]))              # 先归一化相关度, 再 star
    relevant = [c for ov, _, _, c in scored if ov > 0]
    dropped = len(scored) - len(relevant)
    if dropped:
        svc.log.info("search: 相关性过滤掉 %d/%d 个与指纹零重叠的候选(疑似无关/SEO垃圾)",
                     dropped, len(scored))
    return relevant if relevant else [c for _, _, _, c in scored]  # 全零重叠则退回原池, 不空手


def find(fingerprint: ProjectFingerprint, svc: Services) -> list[CandidateRef]:
    system, prompt = prompts.generate_queries(fingerprint)
    qs = svc.llm.structured(task="generate_queries", schema_cls=QuerySet,
                            system=system, prompt=prompt, tier=ModelTier.CHEAP)

    seen: set[tuple[str, str]] = set()
    out: list[CandidateRef] = []
    for q in qs.queries[: svc.settings.max_queries]:
        svc.meter.search_queries += 1
        try:
            hits = svc.search.search(q)
        except SearchError as e:
            svc.log.warning("搜索 query 失败, 跳过: %s", e)   # 单个 query 失败不影响其它
            continue
        for cand in hits:
            key = (cand.name.strip().lower(), cand.url.strip().lower())
            if key in seen:
                continue
            seen.add(key)
            out.append(cand)
    return _rank(fingerprint, out, svc)   # 相关性重排 + 丢无关, 让 verify 的深读花在真竞品上
