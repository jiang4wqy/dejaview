"""底层框架测试: provider 注册表 / DI 容器 / 缓存 / content hash / 优雅降级。"""
from __future__ import annotations

import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # backend/

from app.cache import Cache  # noqa: E402
from app.config import Settings  # noqa: E402
from app.errors import ConfigError  # noqa: E402
from app.jobs import InMemoryJobStore, hash_request  # noqa: E402
from app.models.schemas import AnalysisRequest, JobStatus  # noqa: E402
from app.pipeline.orchestrator import Pipeline  # noqa: E402
from app.providers.crawler import make_crawler  # noqa: E402
from app.providers.llm_router import make_provider  # noqa: E402
from app.providers.mock_provider import MockProvider  # noqa: E402
from app.services import build_services  # noqa: E402


def test_provider_registry_and_unknown():
    assert isinstance(make_provider(Settings(provider="mock")), MockProvider)
    with pytest.raises(ConfigError):
        make_provider(Settings(provider="nope"))


def test_unknown_crawler_raises():
    with pytest.raises(ConfigError):
        make_crawler(Settings(crawler="nope"))


def test_build_services_wires_pluggables():
    svc = build_services(Settings(provider="mock", search_provider="mock", crawler="stub", repomap="stub"))
    assert svc.llm.provider.name == "mock"
    assert svc.search.name == "mock"
    assert svc.crawler.name == "stub"
    assert svc.repomap.name == "stub"
    # router 与 services 共享同一 meter
    assert svc.llm.meter is svc.meter


def test_content_hash_stable_and_stored():
    req = AnalysisRequest(website_url="https://a.example")
    h1, h2 = hash_request(req), hash_request(req)
    assert h1 == h2 and len(h1) == 16
    job = InMemoryJobStore().create(req)
    assert job.content_hash == h1


def test_cache_get_or_compute(tmp_path):
    cache = Cache(str(tmp_path))
    calls = {"n": 0}

    def compute():
        calls["n"] += 1
        return {"v": 42}

    assert cache.get_or_compute("k", compute) == {"v": 42}
    assert cache.get_or_compute("k", compute) == {"v": 42}  # 命中缓存
    assert calls["n"] == 1   # compute 只跑一次


def test_graceful_degradation_on_crawler_failure():
    """网站抓取失败(用会抛错的 firecrawl stub) → 降级 + 记录, 流水线仍跑完。"""
    store = InMemoryJobStore()
    job = store.create(AnalysisRequest(website_url="https://x.example",
                                       github_url="https://github.com/x/y"))
    settings = Settings(provider="mock", search_provider="mock", crawler="firecrawl", repomap="stub")
    Pipeline(settings).run(job)
    assert job.status is JobStatus.DONE               # 没有崩, 跑完了
    assert any("site_analysis" in d for d in job.degradations)
    assert job.site_facts.confidence.value == "low"   # 降级为低置信度


def test_make_job_store():
    from app.jobs import InMemoryJobStore, make_job_store
    assert isinstance(make_job_store(Settings(jobstore="memory")), InMemoryJobStore)
    with pytest.raises(ConfigError):
        make_job_store(Settings(jobstore="nope"))


def test_redis_jobstore_roundtrip():
    """RedisJobStore 用 fakeredis 做离线往返测试(序列化/反序列化 Job)。"""
    import fakeredis

    from app.jobs import RedisJobStore
    store = RedisJobStore(client=fakeredis.FakeRedis(decode_responses=True))
    job = store.create(AnalysisRequest(website_url="https://a.example"))
    got = store.get(job.id)
    assert got is not None and got.id == job.id and got.content_hash == job.content_hash
    got.error = "boom"
    store.put(got)
    assert store.get(job.id).error == "boom"
    assert store.get("nonexistent") is None


def test_sql_jobstore_roundtrip(tmp_path):
    """SqlJobStore 用 SQLite 做往返 + upsert 测试(Postgres 走同一实现)。"""
    from app.jobs import SqlJobStore
    store = SqlJobStore(url=f"sqlite:///{tmp_path}/jobs.db")
    job = store.create(AnalysisRequest(website_url="https://a.example"))
    got = store.get(job.id)
    assert got is not None and got.id == job.id
    got.error = "e2"
    store.put(got)   # upsert -> 更新
    assert store.get(job.id).error == "e2"
    assert store.get("missing") is None


def test_site_analyzer_cache_skips_llm(tmp_path):
    """开启缓存后, 同一 URL 第二次分析命中缓存, 不再调 LLM。"""
    from app.pipeline import site_analyzer
    from app.services import build_services
    svc = build_services(Settings(provider="mock", search_provider="mock",
                                   crawler="stub", repomap="stub", cache_dir=str(tmp_path)))
    req = AnalysisRequest(website_url="https://c.example")
    f1 = site_analyzer.analyze(req, svc)
    calls = svc.llm.meter.llm_calls
    f2 = site_analyzer.analyze(req, svc)   # 第二次: 命中缓存
    assert svc.llm.meter.llm_calls == calls
    assert f2.title == f1.title


def test_inmemory_recent_orders_new_first():
    store = InMemoryJobStore()
    a = store.create(AnalysisRequest(website_url="https://a.example"))
    b = store.create(AnalysisRequest(website_url="https://b.example"))
    assert [j.id for j in store.recent(10)] == [b.id, a.id]   # 新→旧
    assert [j.id for j in store.recent(1)] == [b.id]          # limit 生效


def test_redis_recent_dedups_and_reorders():
    import fakeredis

    from app.jobs import RedisJobStore
    store = RedisJobStore(client=fakeredis.FakeRedis(decode_responses=True))
    a = store.create(AnalysisRequest(website_url="https://a.example"))
    b = store.create(AnalysisRequest(website_url="https://b.example"))
    assert [j.id for j in store.recent(10)] == [b.id, a.id]
    store.put(a)   # 再 put a → 去重后置顶, 不重复
    assert [j.id for j in store.recent(10)] == [a.id, b.id]
