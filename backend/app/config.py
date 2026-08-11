"""运行配置(pydantic-settings)。

所有配置走 `DEJAVIEW_` 前缀的环境变量, 也可放 backend/.env(见 .env.example)。
默认 provider = "mock" —— 零成本、无需任何 API key 就能端到端跑通。
"""
from __future__ import annotations

import logging
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from pydantic import model_validator
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
    search_provider: str = "mock"  # mock | github | v2ex | juejin | tavily | composite
    # composite 时的子源(逗号分隔), 合并多源并去重
    search_sources: str = "github,v2ex"

    # 搜索端配置
    github_token_env: str = "GITHUB_TOKEN"   # 可选; 有则提高 GitHub 搜索速率(30/分 vs 10/分)
    github_per_query: int = 5
    search_timeout: float = 15.0
    tavily_api_key_env: str = "TAVILY_API_KEY"

    # ---- 抓取端配置 ----
    chrome_path: str = ""                       # crawler=browser; 空=自动探测(ms-playwright/puppeteer/系统)
    firecrawl_api_key_env: str = "FIRECRAWL_API_KEY"   # crawler=firecrawl
    crawl_timeout: int = 30

    # ---- repo map token 预算(builtin): 硬上限, 把预算从"文件名清单"换成"入口代码签名" ----
    repomap_budget_chars: int = 12000      # map_text 总字符硬上限(≈喂给抽取模型的 token 预算)
    repomap_signature_files: int = 6       # 最多对几个高信号源文件抽符号签名
    repomap_max_readme: int = 3500         # README 截断(只喂一遍, 见 prompts.repo_extract)

    # ---- 任务存储: memory(默认) | redis | sql(sqlite/postgres) ----
    jobstore: str = "memory"
    redis_url: str = "redis://localhost:6379/0"
    sql_url: str = "sqlite:///dejaview_jobs.db"   # jobstore=sql; Postgres 用 postgresql://...
    # ---- 任务执行: thread(默认后台线程) | rq(Redis 队列 + worker) ----
    queue: str = "thread"

    # ---- API 限流(模式A "部署者请客": 保护自己的 LLM 额度; 生产用 env 打开) ----
    rate_limit_enabled: bool = False       # DEJAVIEW_RATE_LIMIT_ENABLED=true 开启
    rate_limit_per_ip_hourly: int = 10     # 每 IP 每小时最多几次分析 (0=不限)
    rate_limit_per_ip_daily: int = 0       # 每 IP 每天最多几次分析, 当天用完即止 (0=不限)
    rate_limit_daily_total: int = 200      # 全站每天最多几次分析, 到顶当天停 (0=不限)

    # ---- 访问码(可选): 设了就要求进站输口令, 后端在 /api/analyze 强制校验(锁成本给认识的人) ----
    access_code: str = ""                  # 空=不设门槛; 设 DEJAVIEW_ACCESS_CODE 即开启

    # ---- HTTP 边界 ----
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    trusted_proxies: str = ""              # 逗号分隔 IP/CIDR; 空=不信任转发 IP

    # ---- 其它 ----
    cache_dir: str = ""            # 空 = 关闭磁盘缓存
    max_candidates_deep_read: int = 5
    verify_concurrency: int = 4          # verify 并行深读的并发数
    max_queries: int = 8

    @property
    def cors_origin_list(self) -> list[str]:
        """把逗号分隔来源转换为 Starlette CORS 配置。"""
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @model_validator(mode="after")
    def _warn_provider_model_mismatch(self) -> "Settings":
        """脚枪防护: 用 OpenAI 兼容端点(deepseek/qwen)却把 model_* 留成 Claude 名 →
        这些名字会被当作该服务的模型 id 发出去、多半 400。启动时告警提醒改配置。"""
        if self.provider in ("deepseek", "qwen"):
            claudey = [m for m in (self.model_cheap, self.model_standard, self.model_strong)
                       if m.startswith("claude")]
            if claudey:
                logging.getLogger("dejaview.config").warning(
                    "provider=%s 但 model_* 仍是 Claude 名 %s —— 会被当作 %s 的模型名发出、多半 400。"
                    "请设 DEJAVIEW_MODEL_CHEAP/STANDARD/STRONG 为该服务的模型名。",
                    self.provider, claudey, self.provider,
                )
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
