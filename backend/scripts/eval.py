"""评测 harness —— 对数据集里的真实项目批量跑流水线, 汇总指标, 出 markdown + json 报告。

    # 快速验证机制(离线 mock, 秒级):
    DEJAVIEW_PROVIDER=mock DEJAVIEW_CRAWLER=stub DEJAVIEW_REPOMAP=stub DEJAVIEW_SEARCH_PROVIDER=mock \
      ./.venv/bin/python scripts/eval.py --limit 5 --out ../docs/eval_sample

    # 真实校准(用 backend/.env 的 deepseek+builtin+github; 慢, ~每项数分钟, 有 token 成本):
    ./.venv/bin/python scripts/eval.py --out reports/eval_$(date +%F)

看 docs/DESIGN.md §9 的验收标准。
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # backend/

from app.config import get_settings  # noqa: E402
from app.eval.dataset import DATASET  # noqa: E402
from app.jobs import InMemoryJobStore  # noqa: E402
from app.models.schemas import AnalysisRequest, AuthorStatement, ToneMode  # noqa: E402
from app.pipeline.orchestrator import Pipeline  # noqa: E402


def compute_metrics(job) -> dict:
    m = {
        "status": job.status.value, "error": job.error[:80], "seconds": job.cost.seconds,
        "llm_calls": job.cost.llm_calls, "tokens_out": job.cost.output_tokens,
        "degradations": len(job.degradations),
        "fingerprint_ok": False, "candidates": 0, "findings": 0,
        "evidence_cov": 0.0, "duplication": None, "dup_conf": "",
    }
    r = job.result
    if r:
        fp = r.fingerprint
        findings = list(r.issues) + list(r.strengths)
        m.update(
            fingerprint_ok=bool(fp.one_liner and fp.functional_signature),
            candidates=len(r.candidates), findings=len(findings),
            evidence_cov=round(sum(1 for f in findings if f.evidence) / max(1, len(findings)), 2),
            duplication=r.duplication.duplication_score, dup_conf=r.duplication.confidence.value,
        )
    return m


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0, help="只跑前 N 个(0=全部)")
    ap.add_argument("--category", default="", help="只跑某类别 crowded|novel|hard")
    ap.add_argument("--out", default="reports/eval", help="输出前缀(.md/.json)")
    args = ap.parse_args()

    items = [d for d in DATASET if not args.category or d["category"] == args.category]
    if args.limit:
        items = items[: args.limit]

    settings = get_settings()
    print(f"provider={settings.provider} crawler={settings.crawler} "
          f"repomap={settings.repomap} search={settings.search_provider} | {len(items)} 个项目\n")

    rows: list[dict] = []
    t0 = time.time()
    for i, it in enumerate(items, 1):
        req = AnalysisRequest(
            website_url=it.get("website"), github_url=it.get("github"),
            author_statement=AuthorStatement(problem_solved=it.get("problem", "")),
            tone=ToneMode.SERIOUS,
        )
        job = InMemoryJobStore().create(req)
        Pipeline(settings).run(job)
        row = {"name": it["name"], "category": it["category"], **compute_metrics(job)}
        rows.append(row)
        print(f"  [{i}/{len(items)}] {it['name']:<12} {row['status']:<8} "
              f"dup={row['duplication']} cand={row['candidates']} "
              f"ev={row['evidence_cov']} {row['seconds']}s")

    os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)
    with open(f"{args.out}.json", "w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, indent=2)

    ok = [r for r in rows if r["status"] == "done"]
    def avg(k):
        vals = [r[k] for r in ok if isinstance(r.get(k), (int, float))]
        return round(sum(vals) / len(vals), 2) if vals else 0
    lines = [
        f"# DejaView 评测报告", "",
        f"- provider=`{settings.provider}` crawler=`{settings.crawler}` "
        f"repomap=`{settings.repomap}` search=`{settings.search_provider}`",
        f"- 样本: {len(rows)} | 成功: {len(ok)} | 总耗时: {round(time.time()-t0,1)}s",
        f"- 均值: 指纹填充率 {round(sum(1 for r in ok if r['fingerprint_ok'])/max(1,len(ok)),2)} · "
        f"候选 {avg('candidates')} · 证据覆盖 {avg('evidence_cov')} · 重复度 {avg('duplication')} · "
        f"LLM 调用 {avg('llm_calls')} · 耗时 {avg('seconds')}s", "",
        "| 项目 | 类别 | 状态 | 重复度(置信) | 候选 | 证据覆盖 | 指纹 | 降级 | 耗时 |",
        "|---|---|---|---|---|---|---|---|---|",
    ]
    for r in rows:
        dup = f"{r['duplication']}({r['dup_conf']})" if r["duplication"] is not None else "—"
        lines.append(f"| {r['name']} | {r['category']} | {r['status']} | {dup} | "
                     f"{r['candidates']} | {r['evidence_cov']} | {'✓' if r['fingerprint_ok'] else '✗'} | "
                     f"{r['degradations']} | {r['seconds']}s |")
    with open(f"{args.out}.md", "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    print(f"\n报告: {args.out}.md / .json")


if __name__ == "__main__":
    main()
