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

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.jobs import make_job_store
from app.models.schemas import AnalysisRequest, Job, JobStatus, ProjectFingerprint, Report
from app.queue import submit_resume, submit_run
from app.ratelimit import make_rate_limiter

app = FastAPI(title="DejaView API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],        # MVP; 生产收紧到前端域名
    allow_methods=["*"],
    allow_headers=["*"],
)

store = make_job_store(get_settings())   # memory | redis | sql(由 DEJAVIEW_JOBSTORE 决定)
limiter = make_rate_limiter(get_settings())  # 默认 Noop; DEJAVIEW_RATE_LIMIT_ENABLED=true 才限流


def _client_ip(req: Request) -> str:
    """反代之后取真实客户端 IP(X-Forwarded-For 首跳), 否则用直连地址。"""
    xff = req.headers.get("x-forwarded-for", "")
    if xff:
        return xff.split(",")[0].strip()
    return req.client.host if req.client else "unknown"


@app.post("/api/analyze")
def analyze(request: AnalysisRequest, http_request: Request) -> dict:
    decision = limiter.check(_client_ip(http_request))   # 模式A 限流: 保护部署者额度
    if not decision.allowed:
        raise HTTPException(status_code=429, detail=decision.reason,
                            headers={"Retry-After": str(decision.retry_after)})
    job = store.create(request)
    submit_run(get_settings(), store, job)   # thread 或 rq(由 DEJAVIEW_QUEUE 决定)
    return {"job_id": job.id}


@app.get("/api/jobs")
def list_jobs(limit: int = 20) -> list[dict]:
    """最近任务列表(为历史 / 复检对比打基础)。"""
    items = []
    for j in store.recent(limit):
        r = j.result
        items.append({
            "id": j.id, "status": j.status.value, "stage": j.stage.value,
            "created_at": j.created_at.isoformat(), "tone": j.request.tone.value,
            "website_url": j.request.website_url, "github_url": j.request.github_url,
            "one_liner": r.fingerprint.one_liner if r else "",
            "duplication": r.duplication.duplication_score if r else None,
        })
    return items


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
    submit_resume(get_settings(), store, job, fingerprint)
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
