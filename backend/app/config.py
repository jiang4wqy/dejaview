"""运行配置。

默认 provider = "mock" —— 零成本、无需任何 API key 就能跑通整条流水线。
切到真实 Claude: 设 DEJAVIEW_PROVIDER=claude 并配置 ANTHROPIC_API_KEY (或 `ant auth login`)。
"""
from __future__ import annotations

import os

from pydantic import BaseModel


class Settings(BaseModel):
    # provider: "mock" | "claude"  (架构 provider 无关, 这里只定默认值)
    provider: str = os.getenv("DEJAVIEW_PROVIDER", "mock")

    # Claude 分层: 便宜步骤走小模型, 贵步骤走强模型。全部可用环境变量覆盖。
    model_cheap: str = os.getenv("DEJAVIEW_MODEL_CHEAP", "claude-haiku-4-5")       # 提取 / 结构化
    model_standard: str = os.getenv("DEJAVIEW_MODEL_STANDARD", "claude-sonnet-5")  # 判断 / 验证
    model_strong: str = os.getenv("DEJAVIEW_MODEL_STRONG", "claude-opus-4-8")      # 难例 / 裁判

    # search: "mock" | "tavily" | "firecrawl" | "bing" ...  (真实实现见 TODO.md)
    search_provider: str = os.getenv("DEJAVIEW_SEARCH", "mock")

    cache_dir: str = os.getenv("DEJAVIEW_CACHE_DIR", "")   # 空 = 关闭磁盘缓存
    max_candidates_deep_read: int = int(os.getenv("DEJAVIEW_MAX_DEEP_READ", "5"))
    max_queries: int = int(os.getenv("DEJAVIEW_MAX_QUERIES", "8"))


def get_settings() -> Settings:
    return Settings()
