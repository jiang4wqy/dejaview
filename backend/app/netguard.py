"""SSRF / 危险传输防护。

分析会让服务器去**抓取用户给的任意网址**、**clone 用户给的任意仓库**，这两处是公开部署
最容易被利用的攻击面：
  - SSRF：诱导服务器访问本机/内网/云元数据(169.254.169.254)等地址。
  - git 危险传输：`ext::sh -c '...'`(RCE)、`file://`(读本地文件)等。

对策：
  - 抓取前校验网址为 http/https 且**解析到公网 IP**；重定向逐跳复校。
  - clone 前校验为 https:// 且主机在**代码托管白名单**；并在 git 侧加 GIT_ALLOW_PROTOCOL=https 兜底。

注：这是"够用"的防护，非对抗 DNS rebinding 等高级手法的绝对隔离(那需要网络层沙箱)。
"""
from __future__ import annotations

import ipaddress
import socket
from urllib.parse import urljoin, urlparse

from app.errors import CrawlError, RepoError

# 允许 clone 的代码托管站(https)
GIT_HOSTS = {
    "github.com", "www.github.com", "gitlab.com", "bitbucket.org",
    "codeberg.org", "gitee.com", "sourceforge.net",
}


def _ip_is_public(ip: str) -> bool:
    try:
        a = ipaddress.ip_address(ip)
    except ValueError:
        return False
    return not (a.is_private or a.is_loopback or a.is_link_local
                or a.is_multicast or a.is_reserved or a.is_unspecified)


def _host_all_public(host: str) -> bool:
    """host 的所有 A/AAAA 解析结果都必须是公网 IP(任一内网即拒)。"""
    try:
        infos = socket.getaddrinfo(host, None)
    except socket.gaierror:
        return False
    ips = {i[4][0] for i in infos}
    return bool(ips) and all(_ip_is_public(ip) for ip in ips)


def assert_public_http_url(url: str) -> None:
    """抓取用：只放行 http/https 且解析到公网 IP 的地址，否则抛 CrawlError。"""
    p = urlparse(url)
    if p.scheme not in ("http", "https"):
        raise CrawlError(f"只支持 http/https 网址：{url!r}")
    host = p.hostname or ""
    if not host:
        raise CrawlError(f"网址缺少主机名：{url!r}")
    if not _host_all_public(host):
        raise CrawlError(f"拒绝访问非公网地址（本机/内网/元数据）：{host}")


def next_redirect(base: str, location: str) -> str:
    """把重定向 Location 解析成绝对地址并复校(防跳转到内网)。"""
    nxt = urljoin(base, location)
    assert_public_http_url(nxt)
    return nxt


def safe_git_url(url: str) -> str:
    """clone 用：必须 https:// 且主机在白名单，否则抛 RepoError(挡 ext::/file:// 等 RCE)。"""
    u = url.strip()
    p = urlparse(u)
    if p.scheme != "https":
        raise RepoError(f"仓库地址必须是 https://（拒绝 {url!r}）")
    host = (p.hostname or "").lower()
    if host not in GIT_HOSTS:
        raise RepoError(f"只允许这些代码托管站 {sorted(GIT_HOSTS)}，拿到的是 {host!r}")
    return u
