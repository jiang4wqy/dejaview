"""磁盘缓存 TTL 过期测试 (离线, 不联网/不调 LLM)。"""
import os

from app.cache import Cache


def test_get_hits_before_ttl_expires(tmp_path):
    cache = Cache(str(tmp_path), ttl_seconds=1)
    cache.set("k1", {"v": 1})

    assert cache.get("k1") == {"v": 1}


def test_get_misses_after_ttl_expires(tmp_path):
    cache = Cache(str(tmp_path), ttl_seconds=1)
    cache.set("k1", {"v": 1})

    path = os.path.join(str(tmp_path), "k1.json")
    old_time = os.path.getmtime(path) - 2
    os.utime(path, (old_time, old_time))

    assert cache.get("k1") is None
    assert not os.path.exists(path)  # 过期文件应被顺手清理


def test_ttl_zero_never_expires(tmp_path):
    cache = Cache(str(tmp_path), ttl_seconds=0)
    cache.set("k1", {"v": 1})

    path = os.path.join(str(tmp_path), "k1.json")
    old_time = os.path.getmtime(path) - 10_000_000
    os.utime(path, (old_time, old_time))

    assert cache.get("k1") == {"v": 1}
