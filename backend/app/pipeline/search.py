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
_LATIN = re.compile(r"[a-z0-9][a-z0-9+._-]*")


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


def _seed_queries(fp: ProjectFingerprint) -> list[str]:
    """确定性种子 query(不依赖 LLM): 从指纹的机制描述里两两/三三拼出 3~5 条高信号短语, 兜底基础召回。

    LLM 生成的 query 可能因为模型抽风、指令理解偏差而漏掉关键概念; functional_signature/
    core_features 是指纹里信息密度最高、专为驱动检索准备的字段(见 schemas.py 里的字段注释),
    直接从这两个字段确定性抽词拼句, 保证 LLM 完全失灵时也有一轮朴素检索兜底召回。
    """
    bag = " ".join([fp.functional_signature, " ".join(fp.core_features)])
    terms = _tokens(bag) or _fingerprint_terms(fp)   # 机制描述太空就退回全量指纹词, 不空手
    if not terms:
        return []
    # GitHub/网页仓库以英文为主, 中文 query 搜不到英文竞品; 优先只用拉丁字母词(英文/数字)生成种子,
    # 词不够(<2)才退回原有全量词逻辑(含中文), 保证不空手。
    latin_terms = {w for w in terms if _LATIN.fullmatch(w)}
    if len(latin_terms) >= 2:
        terms = latin_terms
    # 集合迭代顺序不确定(str hash 随机化), 按(词长降序, 字典序)排序保证同输入同输出;
    # 词长优先也顺带把更有区分度的专有名词(repository/codebase)排到填充词前面。
    words = sorted(terms, key=lambda w: (-len(w), w))[:6]

    seeds: list[str] = []
    for size in (3, 2):                     # 三词短语信号最强, 双词短语兜底扩大召回
        for i in range(0, len(words) - size + 1, size):
            phrase = " ".join(words[i:i + size])
            if phrase and phrase not in seeds:
                seeds.append(phrase)
    return seeds[:5]


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
    if not relevant and scored:
        svc.log.info("search: 全部 %d 个候选与指纹零重叠, 判定本次未召回到相关竞品, 不再送去深读",
                     len(scored))
    return relevant   # 全零重叠时如实返回空, 别把垃圾原样递给 verify 深读


def find(fingerprint: ProjectFingerprint, svc: Services) -> list[CandidateRef]:
    system, prompt = prompts.generate_queries(fingerprint)
    qs = svc.llm.structured(task="generate_queries", schema_cls=QuerySet,
                            system=system, prompt=prompt, tier=ModelTier.CHEAP)

    # 种子 query 放前面: LLM 抽风生成空/离谱 query 时, 确定性种子兜底基础召回不至于漏光
    merged: list[str] = []
    for q in _seed_queries(fingerprint) + qs.queries:
        q = q.strip()
        if q and q not in merged:
            merged.append(q)

    seen: set[tuple[str, str]] = set()
    out: list[CandidateRef] = []
    for q in merged[: svc.settings.max_queries]:
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
