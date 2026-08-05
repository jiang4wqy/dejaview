"""CLI: 用 mock provider 端到端跑通整条流水线, 无需任何 API key。

    cd backend && ./.venv/bin/python scripts/run_pipeline.py

演示: 分析一个"输入网址→AI 毒舌点评"的示例项目, 召回真实竞品, 输出认真版 + 毒舌版报告。
"""
from __future__ import annotations

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
    "factlayer": "汇总事实层", "render": "生成报告", "done": "完成",
}


def main() -> None:
    req = AnalysisRequest(
        website_url="https://roastmysite.example",
        github_url="https://github.com/example/roastmysite",
        author_statement=AuthorStatement(
            target_users="独立开发者",
            problem_solved="快速拿到网站的犀利反馈",
            claimed_novelty="更犀利的锐评文案",
        ),
        tone=ToneMode.ROAST,
    )
    job = store.create(req)

    def on_progress(j) -> None:
        print(f"  [{j.progress * 100:4.0f}%] {STAGE_ZH.get(j.stage.value, j.stage.value)}")

    print(f"provider = {get_settings().provider}\n--- 运行流水线 ---")
    Pipeline(get_settings(), on_progress=on_progress).run(job)

    r = job.result
    print("\n=== 项目指纹 ===")
    print(" ", r.fingerprint.one_liner)
    print(f"  冲突: {r.fingerprint.conflicts}")
    print(f"\n=== 重复度裁判 ===\n  重复造轮子概率: {r.duplication.duplication_score}"
          f" ({r.duplication.confidence.value})\n  {r.duplication.rationale}")
    print(f"  检索边界: {r.duplication.search_scope_note}")
    print(f"  召回竞品: {[c.ref.name for c in r.candidates]}")

    for tone in ("serious", "roast"):
        rep = job.reports[tone]
        print(f"\n=== {'认真版' if tone == 'serious' else '毒舌版'} ===")
        print(" ", rep.headline)
        print(rep.body_markdown)
        print("  findings(可点开证据):")
        for f in rep.findings:
            ev = f.evidence[0].locator if f.evidence else "(无证据)"
            print(f"    - [{f.severity}] {f.title}  ← 证据: {ev}")

    print(f"\n=== 成本 ===\n  {job.cost.model_dump()}")

    # 核心不变量自检: 毒舌版 findings 全部来自统一事实层
    fact_ids = {f.id for f in r.issues} | {f.id for f in r.strengths}
    roast_ids = {f.id for f in job.reports['roast'].findings}
    assert roast_ids <= fact_ids, "毒舌版出现了事实层之外的 finding!"
    print("\n✔ 不变量通过: 毒舌版没有新增未证实的结论。")


if __name__ == "__main__":
    main()
