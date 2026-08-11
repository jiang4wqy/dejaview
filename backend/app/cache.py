"""内容 hash 缓存 (可选)。

按输入内容 hash 缓存中间产物, 是流水线成本控制的一部分:
同一网站/仓库重复分析时命中缓存, 不重复抓取与调模型。
MVP: 简单的磁盘 JSON 缓存; cache_dir 为空则关闭。真正接入见各 analyzer 的 TODO。
"""
from __future__ import annotations

import hashlib
import json
import os
import time
from typing import Callable, Optional


class Cache:
    def __init__(self, cache_dir: str = "", ttl_seconds: int = 0) -> None:
        self.dir = cache_dir
        self.ttl_seconds = ttl_seconds
        if self.dir:
            os.makedirs(self.dir, exist_ok=True)

    @staticmethod
    def key(*parts: object) -> str:
        raw = "|".join(str(p) for p in parts)
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]

    def get(self, key: str) -> Optional[dict]:
        if not self.dir:
            return None
        path = os.path.join(self.dir, f"{key}.json")
        if not os.path.exists(path):
            return None
        if self.ttl_seconds > 0 and time.time() - os.path.getmtime(path) > self.ttl_seconds:
            # 已过期: 视为未命中, 顺手清理旧文件
            os.remove(path)
            return None
        with open(path, encoding="utf-8") as f:
            return json.load(f)

    def set(self, key: str, value: dict) -> None:
        if not self.dir:
            return
        path = os.path.join(self.dir, f"{key}.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(value, f, ensure_ascii=False, indent=2, default=str)

    def get_or_compute(self, key: str, compute: Callable[[], dict]) -> dict:
        """命中则返回缓存, 否则计算并写入。cache_dir 为空时退化为直接计算。"""
        hit = self.get(key)
        if hit is not None:
            return hit
        value = compute()
        self.set(key, value)
        return value
