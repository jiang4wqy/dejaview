"""orchestrator —— 确定性流水线编排。

每阶段固定输入输出, 易缓存 / 测试 / 替换 / 观测(选'固定流水线'而非'多 Agent'的理由)。
新增:
  * 依赖注入(Services): 统一构建所有可插拔依赖。
  * 每阶段错误处理: 非关键阶段(网站/仓库分析)失败 → 优雅降级 + 记 degradations, 流水线继续;
    关键阶段失败 → StageError 中止并记录。
  * 每阶段耗时(cost.stage_seconds)、成本闸门(生成指纹后可暂停等确认)。
"""
from __future__ import annotations

import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from typing import Callable, Optional, TypeVar

from app.config import Settings
from app.errors import StageError
from app.models.schemas import CostMeter, Job, JobStatus, ProjectFingerprint, Stage, ToneMode
from app.pipeline import factlayer as factlayer_mod
from app.pipeline import fingerprint as fingerprint_mod
from app.pipeline import github_analyzer, site_analyzer
from app.pipeline import judge as judge_mod
from app.pipeline import report as report_mod
from app.pipeline import search as search_mod
from app.pipeline import verify as verify_mod
from app.services import Services, build_services

ProgressCb = Optional[Callable[[Job], None]]
R = TypeVar("R")


class Pipeline:
    def __init__(
        self, settings: Settings, on_progress: ProgressCb = None,
        meter: Optional[CostMeter] = None, services: Optional[Services] = None,
    ) -> None:
        self.settings = settings
        self.on_progress = on_progress
        self.svc: Services = services or build_services(settings, meter=meter)
        self.meter = self.svc.meter
        self._t0 = time.time()

    # ---- 进度快照 ----
    def _tick(self, job: Job, stage: Stage, progress: float,
              status: JobStatus = JobStatus.RUNNING) -> None:
        job.stage = stage
        job.progress = progress
        job.status = status
        job.updated_at = datetime.now(timezone.utc)
        self.meter.seconds = round(time.time() - self._t0, 3)
        job.cost = self.meter.model_copy(deep=True)
        if self.on_progress:
            self.on_progress(job)

    # ---- 推送中间产物(不改阶段), 让前端"边跑边出" ----
    def _push(self, job: Job) -> None:
        job.updated_at = datetime.now(timezone.utc)
        job.cost = self.meter.model_copy(deep=True)
        if self.on_progress:
            self.on_progress(job)

    # ---- 单阶段: 计时 + 错误处理(可降级) ----
    def _stage(self, job: Job, stage: Stage, progress: float, fn: Callable[[], R],
               *, critical: bool = True, fallback: Optional[Callable[[], R]] = None) -> Optional[R]:
        self._tick(job, stage, progress)
        t = time.time()
        try:
            return fn()
        except Exception as e:  # noqa: BLE001
            self.svc.log.warning("阶段 %s 失败: %s", stage.value, e)
            if critical:
                raise StageError(stage.value, str(e)) from e
            job.degradations.append(f"{stage.value}: {e}")
            return fallback() if fallback else None
        finally:
            self.meter.stage_seconds[stage.value] = round(time.time() - t, 3)

    # ---- 阶段 1-3: 提取事实 → 合成指纹(可在此暂停等确认) ----
    def run(self, job: Job) -> Job:
        self._t0 = time.time() - job.cost.seconds
        req = job.request
        try:
            # 网站/仓库分析相互独立 → 并行跑, 缩短端到端耗时
            self._tick(job, Stage.SITE_ANALYSIS, 0.10)

            def _safe(name: str, fn: Callable[[], R], fallback: Callable[[], R]) -> R:
                t = time.time()
                try:
                    return fn()
                except Exception as e:  # noqa: BLE001
                    self.svc.log.warning("阶段 %s 失败: %s", name, e)
                    job.degradations.append(f"{name}: {e}")
                    return fallback()
                finally:
                    self.meter.stage_seconds[name] = round(time.time() - t, 3)

            with ThreadPoolExecutor(max_workers=2) as ex:
                fs = ex.submit(_safe, "site_analysis",
                               lambda: site_analyzer.analyze(req, self.svc),
                               lambda: site_analyzer.empty(req))
                fr = ex.submit(_safe, "github_analysis",
                               lambda: github_analyzer.analyze(req, self.svc),
                               lambda: github_analyzer.empty(req))
                job.site_facts = fs.result()
                job.repo_facts = fr.result()
            self._tick(job, Stage.GITHUB_ANALYSIS, 0.22)

            fp = self._stage(
                job, Stage.FINGERPRINT, 0.35,
                lambda: fingerprint_mod.synthesize(job.site_facts, job.repo_facts,
                                                   req.author_statement, self.svc),
            )
            job.fingerprint = fp
            self._push(job)   # 指纹先亮出来
            if req.confirm_fingerprint and not fp.user_confirmed:
                job.pending_fingerprint = fp
                self._tick(job, Stage.AWAIT_CONFIRM, 0.40, status=JobStatus.AWAIT_CONFIRM)
                return job
            return self._finish(job, fp)
        except StageError as e:
            job.error = str(e)
            self._tick(job, Stage.ERROR, job.progress, status=JobStatus.ERROR)
            return job
        except Exception as e:  # noqa: BLE001
            job.error = f"{type(e).__name__}: {e}"
            self._tick(job, Stage.ERROR, job.progress, status=JobStatus.ERROR)
            return job

    # ---- 成本闸门: 用户确认/修正指纹后从 search 继续 ----
    def resume(self, job: Job, fingerprint: ProjectFingerprint) -> Job:
        self._t0 = time.time() - job.cost.seconds
        fingerprint.user_confirmed = True
        try:
            return self._finish(job, fingerprint)
        except StageError as e:
            job.error = str(e)
            self._tick(job, Stage.ERROR, job.progress, status=JobStatus.ERROR)
            return job
        except Exception as e:  # noqa: BLE001
            job.error = f"{type(e).__name__}: {e}"
            self._tick(job, Stage.ERROR, job.progress, status=JobStatus.ERROR)
            return job

    # ---- 阶段 4-7: 搜索 → 验证 → 裁判 → 事实层 → 渲染 ----
    def _finish(self, job: Job, fp: ProjectFingerprint) -> Job:
        job.pending_fingerprint = None
        job.fingerprint = fp
        # 搜索/验证失败可降级(honest: 本轮没召回到候选), 不至于整单失败
        candidates = self._stage(job, Stage.SEARCH, 0.50,
                                 lambda: search_mod.find(fp, self.svc),
                                 critical=False, fallback=list) or []
        job.candidates = candidates
        self._push(job)   # 竞品陆续揪出来
        verified = self._stage(job, Stage.VERIFY, 0.65,
                               lambda: verify_mod.verify_candidates(candidates, fp, self.svc),
                               critical=False, fallback=list) or []
        job.verified = verified
        self._push(job)   # 深度核对完
        verdict = self._stage(job, Stage.JUDGE, 0.80,
                              lambda: judge_mod.judge(fp, verified, self.svc))
        job.duplication = verdict
        self._push(job)   # 裁决落定
        result = self._stage(job, Stage.FACTLAYER, 0.90,
                             lambda: factlayer_mod.assemble(fp, verified, verdict, self.svc))
        job.result = result
        self._push(job)

        def _render() -> None:
            # 同一事实层渲染所有语气(并行); 各版都不新增未证实结论(见 report.py)
            with ThreadPoolExecutor(max_workers=3) as ex:
                futs = {t.value: ex.submit(report_mod.render, result, t, self.svc) for t in ToneMode}
                for k, f in futs.items():
                    job.reports[k] = f.result()

        self._stage(job, Stage.RENDER, 0.95, _render)
        self._tick(job, Stage.DONE, 1.0, status=JobStatus.DONE)
        return job
