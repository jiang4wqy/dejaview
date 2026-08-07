"""任务分发: thread(默认, 后台线程) | rq(Redis 队列 + 独立 worker)。

rq 模式: `/analyze` 只入队, 由独立 worker 进程跑流水线, 进度写回 store(API 端读同一 store)。
因此 **rq 模式要求持久化 store**(jobstore=redis 或 sql), 否则 worker 的进度另一进程看不到。

起 worker:
    cd backend && DEJAVIEW_QUEUE=rq DEJAVIEW_JOBSTORE=redis \
      ./.venv/bin/rq worker -u redis://localhost:6379/0 dejaview
"""
from __future__ import annotations

import threading

from app.config import Settings, get_settings
from app.jobs import JobStore, make_job_store
from app.models.schemas import Job, ProjectFingerprint
from app.pipeline.orchestrator import Pipeline

QUEUE_NAME = "dejaview"


# ---- worker 侧执行(也被 thread 模式复用) ----
def run_job_task(job_id: str, store: JobStore | None = None) -> None:
    settings = get_settings()
    store = store or make_job_store(settings)   # rq worker(不传 store)自建持久化 store
    job = store.get(job_id)
    if job is None:
        return
    Pipeline(settings, on_progress=store.put).run(job)
    store.put(job)


def resume_job_task(job_id: str, fingerprint_json: str, store: JobStore | None = None) -> None:
    settings = get_settings()
    store = store or make_job_store(settings)
    job = store.get(job_id)
    if job is None:
        return
    fp = ProjectFingerprint.model_validate_json(fingerprint_json)
    Pipeline(settings, on_progress=store.put, meter=job.cost.model_copy(deep=True)).resume(job, fp)
    store.put(job)


def _rq_queue(settings: Settings):
    import redis
    from rq import Queue
    return Queue(QUEUE_NAME, connection=redis.Redis.from_url(settings.redis_url))


# ---- API 侧分发 ----
def submit_run(settings: Settings, store: JobStore, job: Job) -> None:
    if settings.queue == "rq":
        _rq_queue(settings).enqueue(run_job_task, job.id, job_timeout=1800)
    else:
        threading.Thread(target=run_job_task, args=(job.id, store), daemon=True).start()


def submit_resume(settings: Settings, store: JobStore, job: Job, fingerprint: ProjectFingerprint) -> None:
    payload = fingerprint.model_dump_json()
    if settings.queue == "rq":
        _rq_queue(settings).enqueue(resume_job_task, job.id, payload, job_timeout=1800)
    else:
        threading.Thread(target=resume_job_task, args=(job.id, payload, store), daemon=True).start()
