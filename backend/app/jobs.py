"""任务存储。MVP 用内存字典; 生产应换 Redis / Postgres + 真正的任务队列 (见 docs/TODO.md)。"""
from __future__ import annotations

import threading
import uuid
from datetime import datetime, timezone

from app.models.schemas import AnalysisRequest, Job


class JobStore:
    def __init__(self) -> None:
        self._jobs: dict[str, Job] = {}
        self._lock = threading.Lock()

    def create(self, request: AnalysisRequest) -> Job:
        jid = uuid.uuid4().hex[:12]
        now = datetime.now(timezone.utc)
        job = Job(id=jid, request=request, created_at=now, updated_at=now)
        with self._lock:
            self._jobs[jid] = job
        return job

    def get(self, job_id: str) -> Job | None:
        with self._lock:
            return self._jobs.get(job_id)

    def put(self, job: Job) -> None:
        with self._lock:
            self._jobs[job.id] = job


# 进程内单例 (MVP)
store = JobStore()
