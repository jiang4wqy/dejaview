"""provider 无关的模型路由层。

流水线模块只调用 `router.structured(...)`, 不关心底层是 Claude / 国内模型 / mock。
- 分层: ModelTier.CHEAP / STANDARD / STRONG  ->  Haiku / Sonnet / Opus (默认)
- 成本可观测: 每次调用累加到 router.meter (CostMeter)
- MockProvider: 返回 fixtures 里的 canned 结果, 让整条流水线零成本跑通。

要接入国内模型 (DeepSeek / Qwen), 只需新增一个 Provider 子类并在 make_provider 里注册,
其余模块无需改动 —— 这就是"固定输入输出契约"的价值。
"""
from __future__ import annotations

from enum import Enum
from typing import Type, TypeVar

from pydantic import BaseModel

from app.config import Settings
from app.fixtures.mocks import MOCK_LLM
from app.models.schemas import CostMeter

T = TypeVar("T", bound=BaseModel)


class ModelTier(str, Enum):
    CHEAP = "cheap"        # 提取 / 结构化
    STANDARD = "standard"  # 判断 / 验证
    STRONG = "strong"      # 难例 / 裁判


class LLMProvider:
    """Provider 接口。子类实现 structured_json。"""

    def structured_json(
        self, *, task: str, schema_cls: Type[T], system: str, prompt: str,
        model_id: str, thinking: bool,
    ) -> tuple[T, dict]:
        raise NotImplementedError


class MockProvider(LLMProvider):
    """从 fixtures 读取 canned 结果, 按调用方给定的 schema 校验。零成本 / 无需 key。"""

    def structured_json(self, *, task, schema_cls, system, prompt, model_id, thinking):
        if task not in MOCK_LLM:
            raise KeyError(
                f"MockProvider 缺少 task='{task}' 的 fixture; 请在 app/fixtures/mocks.py 补充。"
                f" 已有: {sorted(MOCK_LLM)}"
            )
        obj = schema_cls.model_validate(MOCK_LLM[task])
        return obj, {"input_tokens": 0, "output_tokens": 0}


class ClaudeProvider(LLMProvider):
    """真实 Claude。用 messages.parse 做结构化输出 (推荐)。anthropic SDK 惰性导入。"""

    def __init__(self) -> None:
        import anthropic  # 惰性: mock 模式下完全不需要 anthropic / API key
        self._client = anthropic.Anthropic()

    def structured_json(self, *, task, schema_cls, system, prompt, model_id, thinking):
        kwargs = dict(
            model=model_id,
            max_tokens=4096,
            system=system,
            messages=[{"role": "user", "content": prompt}],
            output_format=schema_cls,   # 结构化输出: 保证返回可校验的 JSON
        )
        if thinking:
            # 仅强模型 (Opus/Sonnet) 用自适应思考; Haiku 4.5 不支持, 见 tier 保护
            kwargs["thinking"] = {"type": "adaptive"}
        try:
            resp = self._client.messages.parse(**kwargs)
        except Exception:
            kwargs.pop("thinking", None)  # 兜底: 去掉 thinking 重试
            resp = self._client.messages.parse(**kwargs)
        usage = getattr(resp, "usage", None)
        return resp.parsed_output, {
            "input_tokens": getattr(usage, "input_tokens", 0),
            "output_tokens": getattr(usage, "output_tokens", 0),
        }


def make_provider(settings: Settings) -> LLMProvider:
    if settings.provider == "claude":
        return ClaudeProvider()
    if settings.provider == "mock":
        return MockProvider()
    # TODO: DeepSeekProvider / QwenProvider —— 见 docs/TODO.md
    raise ValueError(f"未知 provider: {settings.provider!r}")


class LLMRouter:
    def __init__(self, settings: Settings, meter: CostMeter | None = None) -> None:
        self.settings = settings
        self.meter = meter or CostMeter()
        self.provider = make_provider(settings)
        self._tier_model = {
            ModelTier.CHEAP: settings.model_cheap,
            ModelTier.STANDARD: settings.model_standard,
            ModelTier.STRONG: settings.model_strong,
        }

    def structured(
        self, *, task: str, schema_cls: Type[T], system: str, prompt: str,
        tier: ModelTier = ModelTier.CHEAP, thinking: bool = False,
    ) -> T:
        # Haiku(cheap) 不支持自适应思考 —— 自动降级, 避免 400
        use_thinking = thinking and tier is not ModelTier.CHEAP
        obj, usage = self.provider.structured_json(
            task=task, schema_cls=schema_cls, system=system, prompt=prompt,
            model_id=self._tier_model[tier], thinking=use_thinking,
        )
        self.meter.llm_calls += 1
        self.meter.input_tokens += usage.get("input_tokens", 0)
        self.meter.output_tokens += usage.get("output_tokens", 0)
        return obj
