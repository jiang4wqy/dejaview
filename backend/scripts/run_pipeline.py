"""CLI: 端到端跑一遍流水线。

    ./.venv/bin/python scripts/run_pipeline.py                       # 用默认真实项目(Gitingest)
    ./.venv/bin/python scripts/run_pipeline.py --website <url> --github <url> --tone roast

provider / crawler / repomap / search 由 backend/.env 决定(默认 deepseek + builtin + github)。
无 key / 想离线看形状: 设 DEJAVIEW_PROVIDER=mock DEJAVIEW_CRAWLER=stub DEJAVIEW_REPOMAP=stub DEJAVIEW_SEARCH_PROVIDER=mock。
"""
from __future__ import annotations

import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # backend/

from app.config import get_settings  # noqa: E402
from app.jobs import store  # noqa: E402
from app.models.schemas import AnalysisRequest, AuthorStatement, ToneMode  # noqa: E402
from app.pipeline.orchestrator import Pipeline  # noqa: E402

STAGE_ZH = {
    "site_analysis": "分析网站", "github_analysis": "分析仓库", "fingerprint": "合成项目指纹",
    "search": "搜索相似项目", "verify": "验证候选", "judge": "重复度裁判",
    "factlayer": "汇总事实层", "render": "生成报告", "done": "完成", "error": "出错",
}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--website", default="https://gitingest.com")
    ap.add_argument("--github", default="https://github.com/cyclotruc/gitingest")
    ap.add_argument("--tone", choices=["serious", "roast"], default="roast")
    ap.add_argument("--users", default="用 LLM 处理代码库的开发者")
    ap.add_argument("--problem", default="把 GitHub 仓库转成适合喂给 LLM 的文本")
    ap.add_argument("--novelty", default="改 URL 的 hub→ingest 一键转换")
    args = ap.parse_args()

    req = AnalysisRequest(
        website_url=args.website or None, github_url=args.github or None,
        author_statement=AuthorStatement(
            target_users=args.users, problem_solved=args.problem, claimed_novelty=args.novelty),
        tone=ToneMode(args.tone),
    )
    settings = get_settings()
    job = store.create(req)
    print(f"provider={settings.provider} crawler={settings.crawler} "
          f"repomap={settings.repomap} search={settings.search_provider} "
          f"(cheap={settings.model_cheap} strong={settings.model_strong})")
    print(f"分析: {args.website}  +  {args.github}\n--- 运行流水线 ---")
    Pipeline(settings, on_progress=lambda j: print(
        f"  [{j.progress * 100:4.0f}%] {STAGE_ZH.get(j.stage.value, j.stage.value)}")).run(job)

    if job.error:
        print("\n✘ 出错:", job.error)
        if job.degradations:
            print("降级:", job.degradations)
        return

    r = job.result
    print("\n=== 项目指纹 ===")
    print(" ", r.fingerprint.one_liner)
    print("  功能签名:", r.fingerprint.functional_signature)
    if r.fingerprint.conflicts:
        print("  冲突:", r.fingerprint.conflicts)
    print(f"\n=== 重复度裁判 ===\n  重复造轮子概率: {r.duplication.duplication_score}"
          f" ({r.duplication.confidence.value})\n  {r.duplication.rationale}")
    print("  检索边界:", r.duplication.search_scope_note)
    print("  召回竞品:", [f"{c.ref.name}[{c.relation.value}]" for c in r.candidates])

    for tone in ("serious", "roast"):
        rep = job.reports.get(tone)
        if not rep:
            continue
        print(f"\n=== {'认真版' if tone == 'serious' else '毒舌版'} ===\n  {rep.headline}")
        print(rep.body_markdown)
        print("  findings(可点开证据):")
        for f in rep.findings:
            ev = f.evidence[0].locator if f.evidence else "(无证据)"
            print(f"    - [{f.severity}] {f.title}  ← {ev}")

    c = job.cost
    print(f"\n=== 成本 / 观测 ===\n  LLM 调用: {c.llm_calls} | in {c.input_tokens} / out "
          f"{c.output_tokens} tok | 搜索 {c.search_queries} | 总耗时 {c.seconds}s")
    print("  各阶段耗时:", c.stage_seconds)
    if job.degradations:
        print("  降级:", job.degradations)

    fact_ids = {f.id for f in r.issues} | {f.id for f in r.strengths}
    roast = job.reports.get("roast")
    if roast:
        assert {f.id for f in roast.findings} <= fact_ids, "毒舌版出现事实层之外的 finding!"
        print("\n✔ 不变量通过: 毒舌版没有新增未证实的结论。")


if __name__ == "__main__":
    main()
