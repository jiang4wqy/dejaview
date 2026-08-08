"""访问控制与可信代理边界测试。"""
from __future__ import annotations

from types import SimpleNamespace

from app.config import Settings
from app.security import client_ip


class FakeRequest:
    def __init__(self, peer: str | None, headers: dict[str, str]):
        self.client = SimpleNamespace(host=peer) if peer else None
        self.headers = headers


def test_untrusted_peer_cannot_spoof_forwarded_ip():
    request = FakeRequest("203.0.113.10", {"x-forwarded-for": "198.51.100.20"})
    settings = Settings(trusted_proxies="127.0.0.1")

    assert client_ip(request, settings) == "203.0.113.10"


def test_trusted_proxy_uses_first_valid_forwarded_ip():
    request = FakeRequest("127.0.0.1", {"x-forwarded-for": "198.51.100.20, 127.0.0.1"})
    settings = Settings(trusted_proxies="127.0.0.1")

    assert client_ip(request, settings) == "198.51.100.20"


def test_invalid_forwarded_ip_falls_back_to_peer():
    request = FakeRequest("127.0.0.1", {"x-forwarded-for": "not-an-ip"})
    settings = Settings(trusted_proxies="127.0.0.1")

    assert client_ip(request, settings) == "127.0.0.1"


def test_missing_client_is_explicit():
    assert client_ip(FakeRequest(None, {}), Settings()) == "unknown"
