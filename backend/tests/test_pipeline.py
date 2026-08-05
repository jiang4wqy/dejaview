"""流水线端到端测试 (mock provider, 无需 key)。

    cd backend && ./.venv/bin/python -m pytest -q
"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # backend/

from app.config import Settings  # noqa: E402
from app.jobs import JobStore  # noqa: E402
from app.models.schemas import AnalysisRequest, JobStatus, ProjectFingerprint, ToneMode  # noqa: E402
from app.pipeline.orchestrator import Pipeline  # noqa: E402


def _mock_settings() -> Settings:
    return Settings(provider="mock", search_provider="mock")


def _run(**req_kwargs):
    store = JobStore()
    req = AnalysisRequest(
        website_url="https://x.example",
        github_url="https://github.com/x/y",
        tone=ToneMode.SERIOUS,
        **req_kwargs,
    )
    job = store.create(req)
    return Pipeline(_mock_settings()).run(job)


def test_pipeline_completes():
    job = _run()
    assert job.status is JobStatus.DONE
    assert job.progress == 1.0
    assert job.error == ""


def test_fingerprint_and_candidates():
    job = _run()
    assert job.result.fingerprint.one_liner
    assert job.result.fingerprint.functional_signature
    assert len(job.result.candidates) >= 3   # 召回了竞品


def test_duplication_score_in_bounds():
    job = _run()
    s = job.result.duplication.duplication_score
    assert 0.0 <= s <= 1.0
    # 检索边界声明必须存在 (不能说"没有竞品")
    assert job.result.duplication.search_scope_note


def test_both_tones_rendered_from_shared_factlayer():
    job = _run()
    assert "serious" in job.reports and "roast" in job.reports
    assert job.reports["serious"].headline
    assert job.reports["roast"].headline


def test_roast_adds_no_unverified_findings():
    """核心不变量: 毒舌版的每条 finding 都来自统一事实层, 不新增未证实的攻击。"""
    job = _run()
    fact_ids = {f.id for f in job.result.issues} | {f.id for f in job.result.strengths}
    for f in job.reports["roast"].findings:
        assert f.id in fact_ids
    # 且携带证据供 UI 点开
    assert any(f.evidence for f in job.reports["roast"].findings)


def test_cost_meter_tracked():
    job = _run()
    assert job.cost.llm_calls > 0
    assert job.cost.search_queries > 0


def test_confirm_gate_pauses_then_resumes():
    """confirm_fingerprint=True 时应停在 await_confirm, resume 后跑完。"""
    store = JobStore()
    req = AnalysisRequest(website_url="https://x.example", confirm_fingerprint=True)
    job = store.create(req)
    pipe = Pipeline(_mock_settings())
    pipe.run(job)
    assert job.status is JobStatus.AWAIT_CONFIRM
    assert job.pending_fingerprint is not None
    # 用户(可能修正后)确认
    edited: ProjectFingerprint = job.pending_fingerprint
    pipe.resume(job, edited)
    assert job.status is JobStatus.DONE
    assert job.result is not None


def test_github_optional_lowers_confidence():
    """GitHub 可选: 缺失时 repo_facts 明确降置信度, 流水线仍跑完。"""
    store = JobStore()
    req = AnalysisRequest(website_url="https://x.example")  # 无 github_url
    job = store.create(req)
    Pipeline(_mock_settings()).run(job)
    assert job.status is JobStatus.DONE
    assert job.repo_facts.reachable is False
    assert job.repo_facts.confidence.value == "low"
