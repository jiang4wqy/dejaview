"""统一异常类型。让流水线能区分"哪一层出的错"并做优雅降级 / 精确处理。"""
from __future__ import annotations


class DejaViewError(Exception):
    """所有自定义异常的基类。"""


class ConfigError(DejaViewError):
    """配置不合法(如未知 provider)。"""


class ProviderError(DejaViewError):
    """LLM provider 调用失败(网络 / 校验 / 重试耗尽)。"""


class SearchError(DejaViewError):
    """搜索执行端失败。"""


class CrawlError(DejaViewError):
    """网站抓取失败。"""


class RepoError(DejaViewError):
    """仓库读取 / repo map 失败。"""


class StageError(DejaViewError):
    """某个流水线阶段失败, 携带阶段名便于观测与降级。"""

    def __init__(self, stage: str, message: str) -> None:
        self.stage = stage
        self.message = message
        super().__init__(f"[{stage}] {message}")
