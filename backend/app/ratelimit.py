"""API 限流 —— 保护部署者的 LLM 额度(模式 A: "部署者请客")。

两道闸:
  1. 每 IP 每小时上限   —— 防单个用户狂刷。
  2. 全站每日总额度上限 —— 到顶当天停, 硬保护钱包(不管来了多少 IP)。

后端二选一:
  - redis  : 多副本 / 重启不丢, 计数一致(jobstore=redis 或 queue=rq 时自动用)。
  - memory : 单进程内存, 小规模自建站够用。
未启用(默认)时是 Noop, 本地 / 测试 / mock 不受影响。

注: 部署在前端反代之后时, 真实客户端 IP 取自 X-Forwarded-For; 若代理未透传,
每 IP 闸会退化为"整体", 但**每日全站额度**这道闸始终有效——它才是钱包的硬保护。
"""
from __future__ import annotations

import time
from abc import ABC, abstractmethod
from dataclasses import dataclass

from app.config import Settings
from app.logging import get_logger

_log = get_logger("ratelimit")


@dataclass
class Decision:
    allowed: bool
    reason: str = ""
    retry_after: int = 0        # 建议多少秒后重试(写进 Retry-After 头)


class RateLimiter(ABC):
    @abstractmethod
    def check(self, ip: str) -> Decision:
        """放行则消费一次配额并返回 allowed=True; 超限返回 allowed=False + 原因。"""


class NoopRateLimiter(RateLimiter):
    def check(self, ip: str) -> Decision:
        return Decision(True)


def _day_key(now: float) -> str:
    return time.strftime("%Y%m%d", time.gmtime(now))


def _secs_to_utc_midnight(now: float) -> int:
    return 86400 - int(now % 86400)


class MemoryRateLimiter(RateLimiter):
    """单进程内存实现(多副本请用 redis)。"""

    def __init__(self, per_ip_hourly: int, daily_total: int, per_ip_daily: int = 0):
        self.per_ip_hourly = per_ip_hourly
        self.per_ip_daily = per_ip_daily
        self.daily_total = daily_total
        self._ip: dict[str, list[float]] = {}   # ip -> 近一小时时间戳(滑窗)
        self._day = ""
        self._day_count = 0
        self._ip_day: dict[str, int] = {}       # ip -> 当天次数
        self._ip_day_key = ""

    def check(self, ip: str) -> Decision:
        now = time.time()
        day = _day_key(now)
        if day != self._day:                    # 跨天重置全站计数
            self._day, self._day_count = day, 0
        if day != self._ip_day_key:             # 跨天重置每 IP 当天计数
            self._ip_day_key, self._ip_day = day, {}
        midnight = _secs_to_utc_midnight(now)

        # --- 只检查, 全部通过后才消费配额 ---
        if self.daily_total > 0 and self._day_count >= self.daily_total:
            return Decision(False, "今天全站的分析额度用完啦，明天再来～", midnight)
        if self.per_ip_daily > 0 and self._ip_day.get(ip, 0) >= self.per_ip_daily:
            return Decision(False, "你今天的次数用完啦（每人每天有限），明天再来～", midnight)
        hist = [t for t in self._ip.get(ip, []) if now - t < 3600] if self.per_ip_hourly > 0 else []
        if self.per_ip_hourly > 0 and len(hist) >= self.per_ip_hourly:
            self._ip[ip] = hist
            return Decision(False, "你手速太快啦，歇一会儿再试～", max(1, 3600 - int(now - min(hist))))

        # --- 通过所有闸 → 记一次 ---
        self._day_count += 1
        if self.per_ip_daily > 0:
            self._ip_day[ip] = self._ip_day.get(ip, 0) + 1
        if self.per_ip_hourly > 0:
            hist.append(now)
            self._ip[ip] = hist
            if len(self._ip) > 4096:            # 轻量清理过期 IP
                self._ip = {k: v for k, v in self._ip.items() if any(now - t < 3600 for t in v)}
        return Decision(True)


class RedisRateLimiter(RateLimiter):
    """redis 实现: 每日用固定日桶, 每 IP 用固定小时桶。redis 抖动时放行(fail-open)。"""

    def __init__(self, url: str, per_ip_hourly: int, daily_total: int, per_ip_daily: int = 0):
        import redis  # 惰性导入

        self._r = redis.Redis.from_url(url, decode_responses=True)
        self.per_ip_hourly = per_ip_hourly
        self.per_ip_daily = per_ip_daily
        self.daily_total = daily_total

    def ping(self) -> None:
        self._r.ping()

    def check(self, ip: str) -> Decision:
        now = time.time()
        try:
            day = _day_key(now)
            midnight = _secs_to_utc_midnight(now)
            dkey = f"dj:rl:day:{day}"
            ipday = f"dj:rl:ipday:{ip}:{day}"
            if self.daily_total > 0 and int(self._r.get(dkey) or 0) >= self.daily_total:
                return Decision(False, "今天全站的分析额度用完啦，明天再来～", midnight)
            if self.per_ip_daily > 0 and int(self._r.get(ipday) or 0) >= self.per_ip_daily:
                return Decision(False, "你今天的次数用完啦（每人每天有限），明天再来～", midnight)
            if self.per_ip_hourly > 0:
                ikey = f"dj:rl:ip:{ip}:{int(now // 3600)}"
                n = self._r.incr(ikey)
                if n == 1:
                    self._r.expire(ikey, 3600)
                if n > self.per_ip_hourly:
                    return Decision(False, "你手速太快啦，歇一会儿再试～", 3600 - int(now % 3600))
            if self.per_ip_daily > 0:                      # 通过闸 → 计入每 IP 当天
                m = self._r.incr(ipday)
                if m == 1:
                    self._r.expire(ipday, 172800)          # 2 天, 跨过午夜足够
            if self.daily_total > 0:                       # 通过闸 → 计入全站
                g = self._r.incr(dkey)
                if g == 1:
                    self._r.expire(dkey, 172800)
            return Decision(True)
        except Exception as e:  # noqa: BLE001 —— redis 故障不该拖垮站点
            _log.warning("限流后端异常, 本次放行: %s", e)
            return Decision(True)


def make_rate_limiter(settings: Settings) -> RateLimiter:
    if not settings.rate_limit_enabled:
        return NoopRateLimiter()
    per_ip = settings.rate_limit_per_ip_hourly
    per_ip_day = settings.rate_limit_per_ip_daily
    daily = settings.rate_limit_daily_total
    tag = f"每IP/时={per_ip}, 每IP/天={per_ip_day}, 每日全站={daily}"
    if settings.jobstore == "redis" or settings.queue == "rq":
        try:
            rl = RedisRateLimiter(settings.redis_url, per_ip, daily, per_ip_day)
            rl.ping()
            _log.info("限流启用: redis 后端 (%s)", tag)
            return rl
        except Exception as e:  # noqa: BLE001
            _log.warning("限流: redis 不可用(%s), 回退内存后端", e)
    _log.info("限流启用: 内存后端 (%s)", tag)
    return MemoryRateLimiter(per_ip, daily, per_ip_day)
