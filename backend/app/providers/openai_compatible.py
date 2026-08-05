"""OpenAI 兼容 provider —— DeepSeek / Qwen(DashScope) 都提供 OpenAI 兼容端点。

用 JSON mode 让模型返回 JSON, 再用 pydantic 校验(best-effort, 非严格 schema)。
model_id 由分层配置决定: 切到 deepseek 时把 DEJAVIEW_MODEL_* 设成 deepseek-chat 等。

⚠️ 尚未在真实 key 下端到端验证 —— 这是国内模型接入的起点(E9-1), 细节见 docs/TODO.md。
"""
from __future__ import annotations

import json
import os

import httpx

from app.errors import ProviderError
from app.logging import get_logger
from app.providers.base import LLMProvider, ProviderUsage, with_retry


class OpenAICompatibleProvider(LLMProvider):
    def __init__(self, *, name: str, base_url: str, api_key_env: str, retries: int = 2) -> None:
        self.name = name
        self._base_url = base_url.rstrip("/")
        self._api_key_env = api_key_env
        self._retries = retries
        self._log = get_logger(f"provider.{name}")

    def structured_json(self, *, task, schema_cls, system, prompt, model_id, thinking):
        api_key = os.getenv(self._api_key_env, "")
        if not api_key:
            raise ProviderError(f"{self.name}: 环境变量 {self._api_key_env} 未设置")
        schema = schema_cls.model_json_schema()
        system_full = (
            system + "\n\n只输出一个 JSON 对象, 必须严格符合以下 JSON Schema, 不要任何多余文字:\n"
            + json.dumps(schema, ensure_ascii=False)
        )

        def _call() -> dict:
            r = httpx.post(
                f"{self._base_url}/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": model_id,
                    "messages": [
                        {"role": "system", "content": system_full},
                        {"role": "user", "content": prompt},
                    ],
                    "response_format": {"type": "json_object"},
                    "temperature": 0.2,
                },
                timeout=60.0,
            )
            r.raise_for_status()
            return r.json()

        data = with_retry(_call, retries=self._retries, log=self._log, what=f"{self.name}:{task}")
        content = data["choices"][0]["message"]["content"]
        obj = schema_cls.model_validate_json(content)   # JSON mode 非严格 schema, 这里兜底校验
        usage = data.get("usage", {})
        return obj, ProviderUsage(
            input_tokens=usage.get("prompt_tokens", 0),
            output_tokens=usage.get("completion_tokens", 0),
        )
