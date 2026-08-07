"""限流测试: 每 IP 每小时 + 全站每日; 以及工厂在 启用/未启用 下的选择。"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # backend/

from app.config import Settings  # noqa: E402
from app.ratelimit import (  # noqa: E402
    MemoryRateLimiter,
    NoopRateLimiter,
    make_rate_limiter,
)


def test_disabled_is_noop_and_unlimited():
    rl = make_rate_limiter(Settings(rate_limit_enabled=False))
    assert isinstance(rl, NoopRateLimiter)
    for _ in range(1000):
        assert rl.check("1.2.3.4").allowed


def test_per_ip_hourly_cap():
    rl = MemoryRateLimiter(per_ip_hourly=3, daily_total=0)  # 只限每 IP
    assert [rl.check("9.9.9.9").allowed for _ in range(3)] == [True, True, True]
    d = rl.check("9.9.9.9")
    assert not d.allowed and d.retry_after > 0
    # 换个 IP 不受影响
    assert rl.check("8.8.8.8").allowed


def test_daily_total_cap_across_ips():
    rl = MemoryRateLimiter(per_ip_hourly=0, daily_total=5)  # 只限全站每日
    ok = sum(rl.check(f"10.0.0.{i}").allowed for i in range(5))
    assert ok == 5
    d = rl.check("10.0.0.99")           # 第 6 次: 到顶当天停
    assert not d.allowed
    assert "额度" in d.reason and d.retry_after > 0


def test_denied_request_does_not_consume_daily_quota():
    # 每 IP 闸先挡下的请求, 不应计入全站每日额度。
    rl = MemoryRateLimiter(per_ip_hourly=1, daily_total=10)
    assert rl.check("7.7.7.7").allowed          # 用掉该 IP 唯一名额, 全站 +1
    assert not rl.check("7.7.7.7").allowed       # 被每 IP 闸挡下, 全站不 +1
    assert rl._day_count == 1


def test_factory_enabled_memory_backend():
    rl = make_rate_limiter(Settings(rate_limit_enabled=True, jobstore="memory", queue="thread"))
    assert isinstance(rl, MemoryRateLimiter)
