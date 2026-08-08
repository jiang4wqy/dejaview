"""HTTP 安全边界：访问码与可信代理客户端地址。"""
from __future__ import annotations

import secrets
from functools import lru_cache
from ipaddress import ip_address, ip_network

from fastapi import HTTPException, Request

from app.config import Settings, get_settings


def access_ok(request: Request, settings: Settings | None = None) -> bool:
    """未配置访问码时放行；配置后使用常量时间比较。"""
    code = (settings or get_settings()).access_code
    if not code:
        return True
    supplied = request.headers.get("x-access-code", "")
    return bool(supplied) and secrets.compare_digest(supplied, code)


def require_access(request: Request) -> None:
    """FastAPI 依赖：保护会花费额度或暴露任务数据的接口。"""
    if not access_ok(request):
        raise HTTPException(status_code=403, detail="访问码错误或缺失")


@lru_cache(maxsize=32)
def _proxy_networks(raw: str) -> tuple:
    networks = []
    for item in raw.split(","):
        value = item.strip()
        if not value:
            continue
        try:
            networks.append(ip_network(value, strict=False))
        except ValueError:
            # 错误配置必须安全失败：不信任该条目。
            continue
    return tuple(networks)


def client_ip(request: Request, settings: Settings | None = None) -> str:
    """仅在直连来源属于可信代理时采用 X-Forwarded-For 首跳。"""
    peer = request.client.host if request.client else "unknown"
    if peer == "unknown":
        return peer

    config = settings or get_settings()
    try:
        peer_ip = ip_address(peer)
    except ValueError:
        return peer

    if not any(peer_ip in network for network in _proxy_networks(config.trusted_proxies)):
        return peer

    forwarded = request.headers.get("x-forwarded-for", "").split(",", 1)[0].strip()
    if not forwarded:
        return peer
    try:
        return str(ip_address(forwarded))
    except ValueError:
        return peer
