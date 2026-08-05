"""Mock provider —— 从 fixtures 读 canned 结果, 零成本 / 无需 key, 让流水线跑通。"""
from __future__ import annotations

from app.fixtures.mocks import MOCK_LLM
from app.providers.base import LLMProvider, ProviderUsage


class MockProvider(LLMProvider):
    name = "mock"

    def structured_json(self, *, task, schema_cls, system, prompt, model_id, thinking):
        if task not in MOCK_LLM:
            raise KeyError(
                f"MockProvider 缺 task='{task}' 的 fixture; 请在 app/fixtures/mocks.py 补充。"
                f" 已有: {sorted(MOCK_LLM)}"
            )
        return schema_cls.model_validate(MOCK_LLM[task]), ProviderUsage()
