"""轻量日志。统一格式 + 命名空间, 便于按 job/stage 观测流水线。

用法:
    from app.logging import get_logger
    log = get_logger("pipeline.site")
    log.info("...")

设 DEJAVIEW_LOG_LEVEL=DEBUG 可调级别。
"""
from __future__ import annotations

import logging
import os
import sys

DejaViewLogger = logging.Logger  # 类型别名, 方便标注

_configured = False


def _configure() -> None:
    global _configured
    if _configured:
        return
    level = os.getenv("DEJAVIEW_LOG_LEVEL", "INFO").upper()
    handler = logging.StreamHandler(sys.stderr)
    handler.setFormatter(logging.Formatter(
        "%(asctime)s %(levelname)-5s %(name)s: %(message)s", datefmt="%H:%M:%S"
    ))
    root = logging.getLogger("dejaview")
    root.handlers = [handler]
    root.setLevel(getattr(logging, level, logging.INFO))
    root.propagate = False
    _configured = True


def get_logger(name: str = "dejaview") -> DejaViewLogger:
    _configure()
    full = name if name.startswith("dejaview") else f"dejaview.{name}"
    return logging.getLogger(full)
