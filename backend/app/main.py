"""FastAPI 入口。

端点:
  POST /api/analyze            提交分析 → {job_id}; 后台线程跑流水线
  GET  /api/jobs/{id}          轮询进度 / 拿结果 (含两种语气报告)
  POST /api/jobs/{id}/confirm  成本闸门: 提交(修正后的)项目指纹, 从 search 继续
  GET  /api/jobs/{id}/report   便捷取单个语气的报告 (?tone=serious|roast)
  GET  /api/health

MVP: 用后台线程 + 内存 JobStore 跑; 生产应换任务队列 (见 docs/TODO.md)。
"""
from __future__ import annotations

import threading

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.jobs import store
from app.models.schemas import AnalysisRequest, Job, JobStatus, ProjectFingerprint, Report
from app.pipeline.orchestrator import Pipeline

app = FastAPI(title="DejaView API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],        # MVP; 生产收紧到前端域名
    allow_methods=["*"],
    allow_headers=["*"],
)


def _persist(job: Job) -> None:
    store.put(job)


@app.post("/api/analyze")
def analyze(request: AnalysisRequest) -> dict:
    job = store.create(request)
    settings = get_settings()

    def _run() -> None:
        Pipeline(settings, on_progress=_persist).run(job)
        store.put(job)

    threading.Thread(target=_run, daemon=True).start()
    return {"job_id": job.id}


@app.get("/api/jobs/{job_id}", response_model=Job)
def get_job(job_id: str) -> Job:
    job = store.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="job not found")
    return job


@app.post("/api/jobs/{job_id}/confirm", response_model=Job)
def confirm_fingerprint(job_id: str, fingerprint: ProjectFingerprint) -> Job:
    job = store.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="job not found")
    if job.status is not JobStatus.AWAIT_CONFIRM:
        raise HTTPException(status_code=409, detail=f"job not awaiting confirm (status={job.status.value})")
    settings = get_settings()

    def _resume() -> None:
        # 用已累计的 cost 播种 meter, 让成本连续
        Pipeline(settings, on_progress=_persist, meter=job.cost.model_copy()).resume(job, fingerprint)
        store.put(job)

    threading.Thread(target=_resume, daemon=True).start()
    job.status = JobStatus.RUNNING
    store.put(job)
    return job


@app.get("/api/jobs/{job_id}/report", response_model=Report)
def get_report(job_id: str, tone: str = "serious") -> Report:
    job = store.get(job_id)
    if not job or tone not in job.reports:
        raise HTTPException(status_code=404, detail="report not ready")
    return job.reports[tone]


@app.get("/api/health")
def health() -> dict:
    return {"ok": True, "provider": get_settings().provider}
