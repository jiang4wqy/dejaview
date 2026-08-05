"""orchestrator —— 确定性流水线编排。

每个阶段固定输入输出, 便于缓存 / 测试 / 替换 / 观测成本 (这是选'固定流水线'而非'多 Agent'的理由)。
支持"成本闸门": 生成指纹后可暂停等用户确认, 再跑昂贵的搜索/验证/裁判。
"""
from __future__ import annotations

import time
from datetime import datetime, timezone
from typing import Callable, Optional

from app.config import Settings
from app.models.schemas import CostMeter, Job, JobStatus, ProjectFingerprint, Stage, ToneMode
from app.pipeline import factlayer as factlayer_mod
from app.pipeline import fingerprint as fingerprint_mod
from app.pipeline import github_analyzer, site_analyzer
from app.pipeline import judge as judge_mod
from app.pipeline import report as report_mod
from app.pipeline import search as search_mod
from app.pipeline import verify as verify_mod
from app.providers.llm_router import LLMRouter
from app.providers.search_client import make_search_client

ProgressCb = Optional[Callable[[Job], None]]


class Pipeline:
    def __init__(
        self, settings: Settings, on_progress: ProgressCb = None,
        meter: Optional[CostMeter] = None,
    ) -> None:
        self.settings = settings
        self.on_progress = on_progress
        self.router = LLMRouter(settings, meter=meter)      # 成本累加在 router.meter
        self.search_client = make_search_client(settings)
        self._t0 = time.time()

    def _tick(self, job: Job, stage: Stage, progress: float,
              status: JobStatus = JobStatus.RUNNING) -> None:
        job.stage = stage
        job.progress = progress
        job.status = status
        job.updated_at = datetime.now(timezone.utc)
        self.router.meter.seconds = round(time.time() - self._t0, 3)
        job.cost = self.router.meter.model_copy()
        if self.on_progress:
            self.on_progress(job)

    # ---- 阶段 1-3: 提取网站/仓库事实 → 合成指纹 (可在此暂停) ----
    def run(self, job: Job) -> Job:
        self._t0 = time.time() - job.cost.seconds
        try:
            req = job.request
            self._tick(job, Stage.SITE_ANALYSIS, 0.10)
            job.site_facts = site_analyzer.analyze(req, self.router)

            self._tick(job, Stage.GITHUB_ANALYSIS, 0.20)
            job.repo_facts = github_analyzer.analyze(req, self.router)

            self._tick(job, Stage.FINGERPRINT, 0.35)
            fp = fingerprint_mod.synthesize(
                job.site_facts, job.repo_facts, req.author_statement, self.router
            )
            if req.confirm_fingerprint and not fp.user_confirmed:
                job.pending_fingerprint = fp
                self._tick(job, Stage.AWAIT_CONFIRM, 0.40, status=JobStatus.AWAIT_CONFIRM)
                return job
            return self._finish(job, fp)
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
        except Exception as e:  # noqa: BLE001
            job.error = f"{type(e).__name__}: {e}"
            self._tick(job, Stage.ERROR, job.progress, status=JobStatus.ERROR)
            return job

    # ---- 阶段 4-7: 搜索 → 验证 → 裁判 → 事实层 → 渲染 ----
    def _finish(self, job: Job, fp: ProjectFingerprint) -> Job:
        job.pending_fingerprint = None

        self._tick(job, Stage.SEARCH, 0.50)
        candidates = search_mod.find(fp, self.router, self.search_client, self.settings)

        self._tick(job, Stage.VERIFY, 0.65)
        verified = verify_mod.verify_candidates(candidates, fp, self.router, self.settings)

        self._tick(job, Stage.JUDGE, 0.80)
        verdict = judge_mod.judge(fp, verified, self.router)

        self._tick(job, Stage.FACTLAYER, 0.90)
        result = factlayer_mod.assemble(fp, verified, verdict, self.router)
        job.result = result

        self._tick(job, Stage.RENDER, 0.95)
        # 同一事实层渲染两种语气, 前端一键切换; 毒舌版不新增未证实结论 (见 report.py)
        job.reports[ToneMode.SERIOUS.value] = report_mod.render(result, ToneMode.SERIOUS, self.router)
        job.reports[ToneMode.ROAST.value] = report_mod.render(result, ToneMode.ROAST, self.router)

        self._tick(job, Stage.DONE, 1.0, status=JobStatus.DONE)
        return job
