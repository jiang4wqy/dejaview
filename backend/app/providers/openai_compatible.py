"""OpenAI 兼容 provider —— DeepSeek / Qwen(DashScope) 都提供 OpenAI 兼容端点。

用 JSON mode 让模型返回 JSON, 再用 pydantic 校验。因为 JSON mode 不保证严格符合 schema,
这里加了两道保险:
  1) 剥离 ```json ... ``` 代码围栏再解析;
  2) 校验失败时把错误回喂让模型修复(schema-repair), 重试若干轮。
model_id 由分层配置决定(切 deepseek 时 DEJAVIEW_MODEL_* 设成 deepseek-v4-flash / deepseek-v4-pro)。
"""
from __future__ import annotations

import json
import os
import re

import httpx
from pydantic import ValidationError

from app.errors import ProviderError
from app.logging import get_logger
from app.providers.base import LLMProvider, ProviderUsage, with_retry

_FENCE_OPEN = re.compile(r"^\s*```(?:json)?\s*", re.IGNORECASE)
_FENCE_CLOSE = re.compile(r"\s*```\s*$")


def _strip_fences(s: str) -> str:
    s = (s or "").strip()
    if s.startswith("```"):
        s = _FENCE_OPEN.sub("", s)
        s = _FENCE_CLOSE.sub("", s)
    return s.strip()


class OpenAICompatibleProvider(LLMProvider):
    def __init__(
        self, *, name: str, base_url: str, api_key_env: str,
        retries: int = 2, max_tokens: int = 8192, repair_rounds: int = 2, timeout: float = 120.0,
    ) -> None:
        self.name = name
        self._base_url = base_url.rstrip("/")
        self._api_key_env = api_key_env
        self._retries = retries
        self._max_tokens = max_tokens
        self._repair_rounds = repair_rounds
        self._timeout = timeout
        self._log = get_logger(f"provider.{name}")

    def structured_json(self, *, task, schema_cls, system, prompt, model_id, thinking):
        api_key = os.getenv(self._api_key_env, "")
        if not api_key:
            raise ProviderError(f"{self.name}: 环境变量 {self._api_key_env} 未设置")

        schema = json.dumps(schema_cls.model_json_schema(), ensure_ascii=False)
        system_full = (
            system
            + "\n\n只输出一个 JSON 对象, 必须严格符合下面的 JSON Schema; "
            "不要任何解释、前后缀或代码围栏。\nJSON Schema:\n" + schema
        )
        messages = [
            {"role": "system", "content": system_full},
            {"role": "user", "content": prompt},
        ]
        headers = {"Authorization": f"Bearer {api_key}"}
        total_in = total_out = 0
        last_err: Exception | None = None

        for attempt in range(self._repair_rounds + 1):
            def _call() -> dict:
                r = httpx.post(
                    f"{self._base_url}/chat/completions", headers=headers,
                    json={
                        "model": model_id, "messages": messages,
                        "response_format": {"type": "json_object"},
                        "temperature": 0.2, "max_tokens": self._max_tokens,
                    },
                    timeout=self._timeout,
                )
                r.raise_for_status()
                return r.json()

            data = with_retry(_call, retries=self._retries, log=self._log, what=f"{self.name}:{task}")
            usage = data.get("usage", {})
            total_in += usage.get("prompt_tokens", 0)
            total_out += usage.get("completion_tokens", 0)
            content = _strip_fences(data["choices"][0]["message"].get("content") or "")
            try:
                obj = schema_cls.model_validate_json(content)
                return obj, ProviderUsage(input_tokens=total_in, output_tokens=total_out)
            except ValidationError as e:
                last_err = e
                self._log.warning("%s 结构化输出校验失败(第 %d 轮), 回喂让模型修复", task, attempt + 1)
                messages.append({"role": "assistant", "content": content})
                messages.append({"role": "user", "content":
                    f"上面的 JSON 不合法或不符合 schema。校验错误:\n{e}\n"
                    "请只返回修正后的合法 JSON 对象, 不要任何解释或代码围栏。"})

        raise ProviderError(f"{self.name}:{task} 多轮修复后仍无法得到合法 JSON: {last_err}")
