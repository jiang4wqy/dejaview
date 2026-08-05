"""Services —— 依赖注入容器。

把所有可插拔依赖(LLM 路由 / 搜索 / 抓取 / repo map / 缓存 / 日志 / 成本计量)打成一包,
在一处按配置构建, 再传给流水线各模块。模块只从 svc 取自己要的东西, 干净、可测、可替换。
"""
from __future__ import annotations

from dataclasses import dataclass

from app.cache import Cache
from app.config import Settings
from app.logging import DejaViewLogger, get_logger
from app.models.schemas import CostMeter
from app.providers.crawler import Crawler, make_crawler
from app.providers.llm_router import LLMRouter
from app.providers.repomap import RepoMapper, make_repomapper
from app.providers.search_client import SearchClient, make_search_client


@dataclass
class Services:
    settings: Settings
    llm: LLMRouter
    search: SearchClient
    crawler: Crawler
    repomap: RepoMapper
    cache: Cache
    log: DejaViewLogger
    meter: CostMeter


def build_services(
    settings: Settings, meter: CostMeter | None = None, log: DejaViewLogger | None = None,
) -> Services:
    meter = meter or CostMeter()
    log = log or get_logger("pipeline")
    return Services(
        settings=settings,
        llm=LLMRouter(settings, meter=meter),   # 与 meter 共享同一对象
        search=make_search_client(settings),
        crawler=make_crawler(settings),
        repomap=make_repomapper(settings),
        cache=Cache(settings.cache_dir),
        log=log,
        meter=meter,
    )
