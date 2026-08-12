"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { analyze, ApiError, confirmFingerprint, getJob } from "@/lib/api";
import type { Job, ProjectFingerprint } from "@/lib/types";
import { useLang } from "@/lib/i18n";
import StageProgress from "@/components/StageProgress";
import FingerprintEditor from "@/components/FingerprintEditor";
import ReportView from "@/components/ReportView";

const POLL_MS = 1200;

// 需要停止轮询的状态：终态或等待用户确认。
function isTerminal(status: Job["status"]): boolean {
  return status === "done" || status === "error" || status === "await_confirm";
}

export default function ReportPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const { t } = useLang();

  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  // 任务已过期/不存在（后端 404，比如内存态重启丢失）：停止轮询，进入终态提示，不再无限重试。
  const [expired, setExpired] = useState(false);
  // 用户确认指纹后自增，用来重新触发轮询 effect。
  const [resumeToken, setResumeToken] = useState(0);
  const [rechecking, setRechecking] = useState(false);

  // 轮询：每 ~1200ms 拉一次，直到终态 / 等待确认。
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function loop() {
      if (!active) return;
      try {
        const j = await getJob(jobId);
        if (!active) return;
        setJob(j);
        setError(null);
        if (isTerminal(j.status)) return; // 停止轮询
      } catch (err) {
        if (!active) return;
        const message = err instanceof Error ? err.message : t("report.unknownError");
        setError(message);
        // 404 = 任务已过期/不存在：别再无限重试，直接进终态提示。
        const notFound = err instanceof ApiError ? err.status === 404 : /404/.test(message);
        if (notFound) {
          setExpired(true);
          return;
        }
        if (err instanceof ApiError && err.status === 403) return;
      }
      if (active) {
        timer = setTimeout(loop, POLL_MS);
      }
    }

    loop();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [jobId, resumeToken, t]);

  // 复检：用同一目标再跑一遍（改版后看哪些问题真正改善）。跳过成本闸门直接出报告。
  const onRecheck = useCallback(async () => {
    if (!job?.request) return;
    setRechecking(true);
    try {
      const { job_id } = await analyze({ ...job.request, confirm_fingerprint: false });
      window.location.href = `/report/${job_id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : t("report.recheckFailed"));
      setRechecking(false);
    }
  }, [job, t]);

  // 提交编辑后的指纹并恢复流水线；随后重启轮询。
  const onConfirm = useCallback(
    async (fp: ProjectFingerprint) => {
      const updated = await confirmFingerprint(jobId, fp);
      setJob(updated);
      // 若后端已恢复（非终态），重新触发轮询 effect。
      if (!isTerminal(updated.status)) {
        setResumeToken((n) => n + 1);
      }
    },
    [jobId],
  );

  // 任务已过期或不存在：终态提示，不再轮询。可能第一次拉取就 404，也可能中途丢失（此时 job 里还留着最后一次已知状态）。
  if (expired) {
    return (
      <div className="home">
        <TopNav jobId={job?.id ?? jobId} />
        <div className="panel">
          <span className="invest-kicker" style={{ color: "var(--crit)" }}>
            {t("report.expiredKicker")}
          </span>
          <h2 className="panel-title" style={{ marginTop: 10 }}>
            {t("report.expiredTitle")}
          </h2>
          <p className="muted" style={{ margin: "10px 0 0" }}>
            {t("report.expiredBody")}
          </p>
          <div className="actions" style={{ marginTop: 14 }}>
            <button
              type="button"
              className="btn"
              onClick={job?.request ? onRecheck : () => { window.location.href = "/"; }}
              disabled={rechecking}
            >
              {rechecking ? t("report.resubmitting") : job?.request ? t("report.reanalyze") : t("report.backHomeRestart")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 首屏加载中。
  if (!job) {
    return (
      <div className="home">
        <TopNav jobId={jobId} />
        {error ? (
          <div className="panel">
            <h2 className="panel-title">{t("report.errorTitle")}</h2>
            <p className="error" role="alert">{error}</p>
            <div className="actions">
              <button type="button" className="btn" onClick={() => setResumeToken((n) => n + 1)}>
                {t("report.reconnect")}
              </button>
              <Link href="/" className="link-btn">{t("report.backHomeLink")}</Link>
            </div>
          </div>
        ) : (
          <div className="panel">
            <span className="invest-kicker">{t("report.investigatingKicker")}</span>
            <p className="muted" style={{ margin: "10px 0 0" }}>
              {t("report.fetchingCase")}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="home">
      <TopNav
        jobId={job.id}
        onRecheck={(["done", "error"] as Job["status"][]).includes(job.status) && job.request ? onRecheck : undefined}
        rechecking={rechecking}
      />

      {job.status === "error" ? (
        <div className="panel">
          <span className="invest-kicker" style={{ color: "var(--crit)" }}>
            {t("report.abortedKicker")}
          </span>
          <h2 className="panel-title" style={{ marginTop: 10 }}>
            {t("report.analysisFailedTitle")}
          </h2>
          <p className="error">{job.error || t("report.unknownError")}</p>
          <button type="button" className="btn" onClick={onRecheck} disabled={rechecking}>
            {rechecking ? t("report.resubmitting") : t("report.reanalyze")}
          </button>
        </div>
      ) : job.status === "await_confirm" && job.pending_fingerprint ? (
        <FingerprintEditor fingerprint={job.pending_fingerprint} onConfirm={onConfirm} />
      ) : job.status === "done" ? (
        <ReportView job={job} />
      ) : (
        <StageProgress job={job} />
      )}

      {/* 非终态时的瞬时连接错误提示（仍在重试）。 */}
      {error && !isTerminal(job.status) ? (
        <p className="error small" style={{ marginTop: 12 }}>
          {t("report.connIssue", { message: error })}
        </p>
      ) : null}
    </div>
  );
}

function TopNav({
  jobId,
  onRecheck,
  rechecking,
}: {
  jobId: string;
  onRecheck?: () => void;
  rechecking?: boolean;
}) {
  const { t } = useLang();
  return (
    <div className="report-top">
      <Link href="/" className="link-btn">
        {t("report.backHome")}
      </Link>
      <div className="report-top-r">
        {onRecheck ? (
          <button
            type="button"
            className="link-btn"
            onClick={onRecheck}
            disabled={rechecking}
            title={t("report.recheckTooltip")}
          >
            {rechecking ? t("report.rechecking") : t("report.recheck")}
          </button>
        ) : null}
        <span className="caseno">{t("report.caseLabel", { jobId })}</span>
      </div>
    </div>
  );
}
