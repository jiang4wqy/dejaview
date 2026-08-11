"""配置脚枪守卫: provider 用 OpenAI 兼容端点却把 model_* 留成 Claude 名 → 启动告警。"""
from __future__ import annotations

import logging
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # backend/

from app.config import Settings  # noqa: E402


def test_warns_on_provider_model_mismatch(caplog):
    with caplog.at_level(logging.WARNING, logger="dejaview.config"):
        Settings(provider="deepseek", model_cheap="claude-haiku-4-5",
                 model_standard="claude-sonnet-5", model_strong="claude-opus-4-8")
    assert any("model_*" in r.message or "Claude" in r.message for r in caplog.records)


def test_silent_when_models_match_provider(caplog):
    with caplog.at_level(logging.WARNING, logger="dejaview.config"):
        Settings(provider="deepseek", model_cheap="deepseek-chat",
                 model_standard="deepseek-chat", model_strong="deepseek-reasoner")
    assert not caplog.records


def test_silent_for_claude_provider(caplog):
    """provider=claude 用 Claude 名是正确配置, 不应告警。"""
    with caplog.at_level(logging.WARNING, logger="dejaview.config"):
        Settings(provider="claude", model_cheap="claude-haiku-4-5",
                 model_standard="claude-sonnet-5", model_strong="claude-opus-4-8")
    assert not caplog.records
