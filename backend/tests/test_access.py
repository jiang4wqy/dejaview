"""访问码校验逻辑测试。"""
from __future__ import annotations

import os
import sys

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # backend/

from app import config, main  # noqa: E402
from app.security import access_ok  # noqa: E402


class FakeReq:
    def __init__(self, headers: dict):
        self.headers = headers


@pytest.fixture(autouse=True)
def _fresh_settings():
    config.get_settings.cache_clear()
    yield
    config.get_settings.cache_clear()


def test_no_code_means_open(monkeypatch):
    monkeypatch.delenv("DEJAVIEW_ACCESS_CODE", raising=False)
    config.get_settings.cache_clear()
    assert access_ok(FakeReq({})) is True                       # 未设口令 → 恒放行


def test_code_enforced(monkeypatch):
    monkeypatch.setenv("DEJAVIEW_ACCESS_CODE", "sesame-2026")
    config.get_settings.cache_clear()
    assert access_ok(FakeReq({})) is False                      # 缺口令
    assert access_ok(FakeReq({"x-access-code": "nope"})) is False  # 错口令
    assert access_ok(FakeReq({"x-access-code": "sesame-2026"})) is True  # 对


@pytest.mark.parametrize(
    "path",
    [
        "/api/jobs",
        "/api/jobs/missing",
        "/api/jobs/missing/report",
    ],
)
def test_task_reads_require_code(monkeypatch, path):
    monkeypatch.setenv("DEJAVIEW_ACCESS_CODE", "sesame-2026")
    config.get_settings.cache_clear()

    response = TestClient(main.app).get(path)

    assert response.status_code == 403


def test_public_endpoints_stay_public(monkeypatch):
    monkeypatch.setenv("DEJAVIEW_ACCESS_CODE", "sesame-2026")
    config.get_settings.cache_clear()
    client = TestClient(main.app)

    assert client.get("/api/health").status_code == 200
    response = client.post("/api/access")
    assert response.status_code == 200
    assert response.json() == {"ok": False}


def test_correct_code_can_list_jobs(monkeypatch):
    monkeypatch.setenv("DEJAVIEW_ACCESS_CODE", "sesame-2026")
    config.get_settings.cache_clear()

    response = TestClient(main.app).get(
        "/api/jobs",
        headers={"X-Access-Code": "sesame-2026"},
    )

    assert response.status_code == 200
