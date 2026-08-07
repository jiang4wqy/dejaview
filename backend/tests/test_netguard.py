"""SSRF / git 传输防护测试。用字面 IP，离线可跑（不依赖真实 DNS）。"""
from __future__ import annotations

import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # backend/

from app.errors import CrawlError, RepoError  # noqa: E402
from app.netguard import assert_public_http_url, safe_git_url  # noqa: E402


def test_blocks_internal_addresses():
    for bad in [
        "http://127.0.0.1/", "http://localhost/", "http://169.254.169.254/latest/meta-data/",
        "http://10.0.0.5/", "http://192.168.1.1/", "http://172.16.0.1/", "http://[::1]/",
        "http://0.0.0.0/",
    ]:
        with pytest.raises(CrawlError):
            assert_public_http_url(bad)


def test_blocks_non_http_scheme():
    for bad in ["file:///etc/passwd", "ftp://x/", "gopher://127.0.0.1/", "ext::sh -c id"]:
        with pytest.raises(CrawlError):
            assert_public_http_url(bad)


def test_allows_public_literal_ip():
    assert_public_http_url("https://1.1.1.1/")   # 公网字面 IP，无需 DNS
    assert_public_http_url("http://8.8.8.8/x")


def test_git_url_allowlist_ok():
    assert safe_git_url("https://github.com/owner/repo") == "https://github.com/owner/repo"
    assert safe_git_url(" https://gitlab.com/a/b ") == "https://gitlab.com/a/b"


def test_git_url_rejects_dangerous():
    for bad in [
        "ext::sh -c 'touch /tmp/pwn'",   # RCE 传输
        "file:///tmp/repo",              # 读本地
        "git://github.com/x/y",          # 非 https
        "http://github.com/x/y",         # 非 https
        "https://evil.com/x/y",          # 主机不在白名单
        "https://github.com.evil.com/x", # 伪装域名
        "-upload-pack=touch",            # 选项注入形态
    ]:
        with pytest.raises(RepoError):
            safe_git_url(bad)
