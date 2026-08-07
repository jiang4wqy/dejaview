"""Claude provider —— 用 messages.parse 做结构化输出(推荐), 带重试。

anthropic SDK 惰性导入: mock 模式下完全不需要 anthropic / API key。
分层由上层(LLMRouter)决定 model_id; 难例(judge)会传 thinking=True 走自适应思考。
"""
from __future__ import annotations

from app.logging import get_logger
from app.providers.base import LLMProvider, ProviderUsage, with_retry


class ClaudeProvider(LLMProvider):
    name = "claude"

    def __init__(self, retries: int = 2) -> None:
        import anthropic  # 惰性
        self._client = anthropic.Anthropic()
        self._retries = retries
        self._log = get_logger("provider.claude")

    def structured_json(self, *, task, schema_cls, system, prompt, model_id, thinking):
        def _call():
            kwargs = dict(
                model=model_id, max_tokens=4096, system=system,
                messages=[{"role": "user", "content": prompt}],
                output_format=schema_cls,   # 结构化输出, 保证可校验 JSON
            )
            if thinking:
                kwargs["thinking"] = {"type": "adaptive"}
            try:
                return self._client.messages.parse(**kwargs)
            except Exception:
                kwargs.pop("thinking", None)   # 兜底去掉 thinking 重试一次
                return self._client.messages.parse(**kwargs)

        resp = with_retry(_call, retries=self._retries, log=self._log, what=f"claude:{task}")
        u = getattr(resp, "usage", None)
        return resp.parsed_output, ProviderUsage(
            input_tokens=getattr(u, "input_tokens", 0),
            output_tokens=getattr(u, "output_tokens", 0),
        )
