"""任务存储。抽象成 JobStore, 内存实现 InMemoryJobStore; 生产可换 Redis/Postgres(E10-1)。"""
from __future__ import annotations

import hashlib
import threading
import uuid
from abc import ABC, abstractmethod
from datetime import datetime, timezone

from app.models.schemas import AnalysisRequest, Job


def hash_request(request: AnalysisRequest) -> str:
    """请求内容 hash —— 供去重 / 版本重检(改版后重新检测哪些问题真正改善)。"""
    return hashlib.sha256(request.model_dump_json().encode("utf-8")).hexdigest()[:16]


class JobStore(ABC):
    @abstractmethod
    def create(self, request: AnalysisRequest) -> Job: ...

    @abstractmethod
    def get(self, job_id: str) -> Job | None: ...

    @abstractmethod
    def put(self, job: Job) -> None: ...


class InMemoryJobStore(JobStore):
    def __init__(self) -> None:
        self._jobs: dict[str, Job] = {}
        self._lock = threading.Lock()

    def create(self, request: AnalysisRequest) -> Job:
        jid = uuid.uuid4().hex[:12]
        now = datetime.now(timezone.utc)
        job = Job(id=jid, request=request, created_at=now, updated_at=now,
                  content_hash=hash_request(request))
        with self._lock:
            self._jobs[jid] = job
        return job

    def get(self, job_id: str) -> Job | None:
        with self._lock:
            return self._jobs.get(job_id)

    def put(self, job: Job) -> None:
        with self._lock:
            self._jobs[job.id] = job


# TODO(E10-1): RedisJobStore / SqlJobStore
store: JobStore = InMemoryJobStore()   # 进程内单例(MVP)
