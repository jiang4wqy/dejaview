"""配置脚枪守卫: provider 用 OpenAI 兼容端点却把 model_* 留成 Claude 名 → 启动告警。

注: 直接给 "dejaview.config" logger 挂捕获 handler(而非 caplog), 这样不受
其他用例 import app.main 后设 propagate=False 的影响(全量套件顺序下才稳)。
"""
from __future__ import annotations

import logging
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # backend/

from app.config import Settings  # noqa: E402


class _Capture(logging.Handler):
    def __init__(self) -> None:
        super().__init__()
        self.messages: list[str] = []

    def emit(self, record: logging.LogRecord) -> None:
        self.messages.append(record.getMessage())


def _warnings_for(**kw) -> list[str]:
    logger = logging.getLogger("dejaview.config")
    cap = _Capture()
    old_level = logger.level
    logger.addHandler(cap)
    logger.setLevel(logging.WARNING)
    try:
        Settings(**kw)                       # init kwargs 优先于 env/.env, 测试不受本地 .env 干扰
    finally:
        logger.removeHandler(cap)
        logger.setLevel(old_level)
    return cap.messages


def test_warns_on_provider_model_mismatch():
    msgs = _warnings_for(provider="deepseek", model_cheap="claude-haiku-4-5",
                         model_standard="claude-sonnet-5", model_strong="claude-opus-4-8")
    assert any("model_*" in m or "Claude" in m for m in msgs)


def test_silent_when_models_match_provider():
    msgs = _warnings_for(provider="deepseek", model_cheap="deepseek-chat",
                         model_standard="deepseek-chat", model_strong="deepseek-reasoner")
    assert msgs == []


def test_silent_for_claude_provider():
    """provider=claude 用 Claude 名是正确配置, 不应告警。"""
    msgs = _warnings_for(provider="claude", model_cheap="claude-haiku-4-5",
                         model_standard="claude-sonnet-5", model_strong="claude-opus-4-8")
    assert msgs == []
