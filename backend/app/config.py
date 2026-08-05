"""运行配置(pydantic-settings)。

所有配置走 `DEJAVIEW_` 前缀的环境变量, 也可放 backend/.env(见 .env.example)。
默认 provider = "mock" —— 零成本、无需任何 API key 就能端到端跑通。
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

# 让 backend/.env 里的非 DEJAVIEW_ 变量(DEEPSEEK_API_KEY / GITHUB_TOKEN 等)也进 os.environ,
# 供各 provider 的 os.getenv 读取。不覆盖已有环境变量。
load_dotenv(Path(__file__).resolve().parent.parent / ".env")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="DEJAVIEW_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        protected_namespaces=(),   # 允许 model_* 字段名
    )

    # ---- LLM provider: mock | claude | deepseek | qwen (架构 provider 无关) ----
    provider: str = "mock"
    # Claude 分层默认值(便宜步骤走小模型, 全部可覆盖)
    model_cheap: str = "claude-haiku-4-5"       # 提取 / 结构化
    model_standard: str = "claude-sonnet-5"     # 判断 / 验证
    model_strong: str = "claude-opus-4-8"       # 难例 / 裁判
    llm_retries: int = 2

    # ---- OpenAI 兼容端点(DeepSeek / Qwen 都兼容) ----
    deepseek_base_url: str = "https://api.deepseek.com/v1"
    deepseek_api_key_env: str = "DEEPSEEK_API_KEY"
    qwen_base_url: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    qwen_api_key_env: str = "DASHSCOPE_API_KEY"

    # ---- 抓取 / repo map / 搜索 执行端(均可插拔) ----
    crawler: str = "stub"          # stub | firecrawl | crawl4ai
    repomap: str = "stub"          # stub | gitingest | aider
    search_provider: str = "mock"  # mock | tavily | github

    # 搜索端配置
    github_token_env: str = "GITHUB_TOKEN"   # 可选; 有则提高 GitHub 搜索速率(30/分 vs 10/分)
    github_per_query: int = 5
    search_timeout: float = 15.0
    tavily_api_key_env: str = "TAVILY_API_KEY"

    # ---- 其它 ----
    cache_dir: str = ""            # 空 = 关闭磁盘缓存
    max_candidates_deep_read: int = 5
    max_queries: int = 8


@lru_cache
def get_settings() -> Settings:
    return Settings()
