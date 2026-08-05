"""LLM provider 基础层。

新增一个 provider = 继承 LLMProvider 实现 structured_json, 在 llm_router.make_provider 注册。
其余模块零改动 —— 这是"固定输入输出契约 + 可插拔"的核心。
"""
from __future__ import annotations

import time
from typing import Callable, Type, TypeVar

from pydantic import BaseModel

from app.errors import ProviderError
from app.logging import DejaViewLogger

T = TypeVar("T", bound=BaseModel)


class ProviderUsage(BaseModel):
    input_tokens: int = 0
    output_tokens: int = 0


class LLMProvider:
    """Provider 接口。"""
    name: str = "base"

    def structured_json(
        self, *, task: str, schema_cls: Type[T], system: str, prompt: str,
        model_id: str, thinking: bool,
    ) -> tuple[T, ProviderUsage]:
        raise NotImplementedError


def with_retry(
    fn: Callable[[], T], *, retries: int = 2, base_delay: float = 0.5,
    log: DejaViewLogger | None = None, what: str = "provider call",
) -> T:
    """指数退避重试。用于远程 provider(网络/瞬时错误); mock 不需要。"""
    last: Exception | None = None
    for attempt in range(retries + 1):
        try:
            return fn()
        except Exception as e:  # noqa: BLE001
            last = e
            if attempt >= retries:
                break
            delay = base_delay * (2 ** attempt)
            if log:
                log.warning("%s 第 %d/%d 次重试, %.1fs 后: %s", what, attempt + 1, retries, delay, e)
            time.sleep(delay)
    raise ProviderError(f"{what} 失败(重试 {retries} 次): {last}") from last
