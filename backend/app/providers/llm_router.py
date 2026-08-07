"""模型路由层。分层 (CHEAP/STANDARD/STRONG) + provider 注册表 + 成本累加。

流水线模块只调用 `router.structured(...)`, 不关心底层是 Claude / DeepSeek / Qwen / mock。
"""
from __future__ import annotations

import threading
from enum import Enum
from typing import Type, TypeVar

from pydantic import BaseModel

from app.config import Settings
from app.errors import ConfigError
from app.logging import get_logger
from app.models.schemas import CostMeter
from app.providers.base import LLMProvider
from app.providers.claude_provider import ClaudeProvider
from app.providers.mock_provider import MockProvider
from app.providers.openai_compatible import OpenAICompatibleProvider

T = TypeVar("T", bound=BaseModel)


class ModelTier(str, Enum):
    CHEAP = "cheap"        # 提取 / 结构化
    STANDARD = "standard"  # 判断 / 验证
    STRONG = "strong"      # 难例 / 裁判


def make_provider(settings: Settings) -> LLMProvider:
    p = settings.provider
    if p == "mock":
        return MockProvider()
    if p == "claude":
        return ClaudeProvider(retries=settings.llm_retries)
    if p == "deepseek":
        return OpenAICompatibleProvider(
            name="deepseek", base_url=settings.deepseek_base_url,
            api_key_env=settings.deepseek_api_key_env, retries=settings.llm_retries,
        )
    if p == "qwen":
        return OpenAICompatibleProvider(
            name="qwen", base_url=settings.qwen_base_url,
            api_key_env=settings.qwen_api_key_env, retries=settings.llm_retries,
        )
    raise ConfigError(f"未知 provider: {p!r} (可选 mock|claude|deepseek|qwen)")


class LLMRouter:
    def __init__(self, settings: Settings, meter: CostMeter | None = None) -> None:
        self.settings = settings
        self.meter = meter or CostMeter()
        self.provider = make_provider(settings)
        self.log = get_logger("llm")
        self._lock = threading.Lock()   # 保护 meter(verify 并行时并发累加)
        self._tier_model = {
            ModelTier.CHEAP: settings.model_cheap,
            ModelTier.STANDARD: settings.model_standard,
            ModelTier.STRONG: settings.model_strong,
        }

    def structured(
        self, *, task: str, schema_cls: Type[T], system: str, prompt: str,
        tier: ModelTier = ModelTier.CHEAP, thinking: bool = False,
    ) -> T:
        # Haiku(cheap) 不支持自适应思考 —— 自动降级避免 400
        use_thinking = thinking and tier is not ModelTier.CHEAP
        obj, usage = self.provider.structured_json(
            task=task, schema_cls=schema_cls, system=system, prompt=prompt,
            model_id=self._tier_model[tier], thinking=use_thinking,
        )
        with self._lock:
            self.meter.llm_calls += 1
            self.meter.input_tokens += usage.input_tokens
            self.meter.output_tokens += usage.output_tokens
        return obj
