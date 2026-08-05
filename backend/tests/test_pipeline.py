"""流水线端到端测试(mock provider, 无需 key)。

    cd backend && ./.venv/bin/python -m pytest -q
"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # backend/

from app.config import Settings  # noqa: E402
from app.jobs import InMemoryJobStore  # noqa: E402
from app.models.schemas import AnalysisRequest, JobStatus, ProjectFingerprint, ToneMode  # noqa: E402
from app.pipeline.orchestrator import Pipeline  # noqa: E402


def _mock_settings(**kw) -> Settings:
    # 显式钉住 stub/mock, 保证测试离线且不受 backend/.env 影响
    return Settings(provider="mock", search_provider="mock", crawler="stub", repomap="stub", **kw)


def _run(**req_kwargs):
    store = InMemoryJobStore()
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
    assert len(job.result.candidates) >= 3


def test_duplication_score_in_bounds():
    job = _run()
    s = job.result.duplication.duplication_score
    assert 0.0 <= s <= 1.0
    assert job.result.duplication.search_scope_note   # 不能说"没有竞品"


def test_both_tones_rendered_from_shared_factlayer():
    job = _run()
    assert "serious" in job.reports and "roast" in job.reports
    assert job.reports["serious"].headline and job.reports["roast"].headline


def test_roast_adds_no_unverified_findings():
    """核心不变量: 毒舌版的每条 finding 都来自统一事实层, 不新增未证实的攻击。"""
    job = _run()
    fact_ids = {f.id for f in job.result.issues} | {f.id for f in job.result.strengths}
    for f in job.reports["roast"].findings:
        assert f.id in fact_ids
    assert any(f.evidence for f in job.reports["roast"].findings)


def test_cost_meter_tracked():
    job = _run()
    assert job.cost.llm_calls > 0
    assert job.cost.search_queries > 0
    assert job.cost.stage_seconds   # 每阶段耗时被记录


def test_confirm_gate_pauses_then_resumes():
    store = InMemoryJobStore()
    req = AnalysisRequest(website_url="https://x.example", confirm_fingerprint=True)
    job = store.create(req)
    pipe = Pipeline(_mock_settings())
    pipe.run(job)
    assert job.status is JobStatus.AWAIT_CONFIRM
    assert job.pending_fingerprint is not None
    edited: ProjectFingerprint = job.pending_fingerprint
    pipe.resume(job, edited)
    assert job.status is JobStatus.DONE
    assert job.result is not None


def test_github_optional_lowers_confidence():
    store = InMemoryJobStore()
    req = AnalysisRequest(website_url="https://x.example")  # 无 github_url
    job = store.create(req)
    Pipeline(_mock_settings()).run(job)
    assert job.status is JobStatus.DONE
    assert job.repo_facts.reachable is False
    assert job.repo_facts.confidence.value == "low"
