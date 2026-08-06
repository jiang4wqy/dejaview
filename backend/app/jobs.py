"""任务存储。抽象成 JobStore; 内存实现(默认) + Redis 实现(持久化, 生产用)。"""
from __future__ import annotations

import hashlib
import threading
import uuid
from abc import ABC, abstractmethod
from datetime import datetime, timezone

from app.config import Settings
from app.models.schemas import AnalysisRequest, Job


def hash_request(request: AnalysisRequest) -> str:
    """请求内容 hash —— 供去重 / 版本重检(改版后重新检测哪些问题真正改善)。"""
    return hashlib.sha256(request.model_dump_json().encode("utf-8")).hexdigest()[:16]


def _new_job(request: AnalysisRequest) -> Job:
    now = datetime.now(timezone.utc)
    return Job(id=uuid.uuid4().hex[:12], request=request, created_at=now, updated_at=now,
               content_hash=hash_request(request))


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
        job = _new_job(request)
        with self._lock:
            self._jobs[job.id] = job
        return job

    def get(self, job_id: str) -> Job | None:
        with self._lock:
            return self._jobs.get(job_id)

    def put(self, job: Job) -> None:
        with self._lock:
            self._jobs[job.id] = job


class RedisJobStore(JobStore):
    """把 Job 以 JSON 存进 Redis(进程重启/多副本不丢)。序列化用 pydantic。"""

    def __init__(self, url: str = "redis://localhost:6379/0", *, client=None,
                 ttl_seconds: int = 7 * 86400, prefix: str = "dejaview:job:") -> None:
        if client is None:
            import redis  # 惰性: 只有选 redis 时才需要
            client = redis.Redis.from_url(url, decode_responses=True)
        self._r = client
        self._ttl = ttl_seconds
        self._prefix = prefix

    def _key(self, job_id: str) -> str:
        return f"{self._prefix}{job_id}"

    def create(self, request: AnalysisRequest) -> Job:
        job = _new_job(request)
        self.put(job)
        return job

    def get(self, job_id: str) -> Job | None:
        raw = self._r.get(self._key(job_id))
        return Job.model_validate_json(raw) if raw else None

    def put(self, job: Job) -> None:
        self._r.set(self._key(job.id), job.model_dump_json(), ex=self._ttl)


class SqlJobStore(JobStore):
    """SQL 持久化(SQLite / Postgres via DSN)。单表存 Job 的 JSON, 可移植 upsert。"""

    def __init__(self, url: str = "sqlite:///dejaview_jobs.db") -> None:
        from sqlalchemy import Column, MetaData, String, Table, Text, create_engine
        self._engine = create_engine(url, future=True)
        md = MetaData()
        self._t = Table("dejaview_jobs", md,
                        Column("id", String(32), primary_key=True),
                        Column("data", Text, nullable=False))
        md.create_all(self._engine)

    def create(self, request: AnalysisRequest) -> Job:
        job = _new_job(request)
        self.put(job)
        return job

    def get(self, job_id: str) -> Job | None:
        from sqlalchemy import select
        with self._engine.connect() as c:
            row = c.execute(select(self._t.c.data).where(self._t.c.id == job_id)).first()
        return Job.model_validate_json(row[0]) if row else None

    def put(self, job: Job) -> None:
        from sqlalchemy import insert, update
        data = job.model_dump_json()
        with self._engine.begin() as c:  # UPDATE 命中就更新, 否则 INSERT(sqlite/pg 通用)
            r = c.execute(update(self._t).where(self._t.c.id == job.id).values(data=data))
            if r.rowcount == 0:
                c.execute(insert(self._t).values(id=job.id, data=data))


def make_job_store(settings: Settings) -> JobStore:
    if settings.jobstore == "redis":
        return RedisJobStore(url=settings.redis_url)
    if settings.jobstore in ("sql", "postgres"):
        return SqlJobStore(url=settings.sql_url)
    if settings.jobstore == "memory":
        return InMemoryJobStore()
    from app.errors import ConfigError
    raise ConfigError(f"未知 jobstore: {settings.jobstore!r} (可选 memory|redis|sql)")


# 进程内默认单例(CLI / 测试用); 服务端 main.py 会按配置 make_job_store
store: JobStore = InMemoryJobStore()
