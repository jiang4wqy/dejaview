"""verify 深读数量自适应(离线): 只测纯函数 _deep_read_count, 不碰 LLM/services。"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # backend/

from app.pipeline.verify import _deep_read_count  # noqa: E402


def test_deep_read_count_fixed_points():
    assert _deep_read_count(3, 3, 6) == 3    # 池子刚好等于 floor → 全读
    assert _deep_read_count(1, 3, 6) == 1    # 池子不足 floor → 有多少读多少
    assert _deep_read_count(5, 3, 6) == 4    # 池子超 floor → 往 ceiling 靠一半
    assert _deep_read_count(8, 3, 6) == 6    # 池子够大 → 封顶 ceiling
    assert _deep_read_count(20, 3, 6) == 6   # 池子很大 → 依旧封顶 ceiling


def test_deep_read_count_bounds():
    for n in [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 15, 20, 50]:
        floor, ceiling = 3, 6
        k = _deep_read_count(n, floor, ceiling)
        assert k <= min(n, ceiling)          # 不超过池子大小, 也不超过上限
        assert k >= min(n, 1)                # 池子非空至少读 1 个
