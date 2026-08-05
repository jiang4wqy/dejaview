"use client";

import { useCallback, useEffect, useState } from "react";
import { confirmFingerprint, getJob } from "@/lib/api";
import type { Job, ProjectFingerprint } from "@/lib/types";
import StageProgress from "@/components/StageProgress";
import FingerprintEditor from "@/components/FingerprintEditor";
import ReportView from "@/components/ReportView";

const POLL_MS = 1200;

// 需要停止轮询的状态：终态或等待用户确认。
function isTerminal(status: Job["status"]): boolean {
  return status === "done" || status === "error" || status === "await_confirm";
}

export default function ReportPage({ params }: { params: { jobId: string } }) {
  const { jobId } = params;

  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  // 用户确认指纹后自增，用来重新触发轮询 effect。
  const [resumeToken, setResumeToken] = useState(0);

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
        // 轮询期间的瞬时错误：记录但继续重试。
        setError(err instanceof Error ? err.message : "获取任务失败");
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
  }, [jobId, resumeToken]);

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

  // 首屏加载中。
  if (!job) {
    return (
      <div className="report-page">
        <TopNav jobId={jobId} />
        {error ? (
          <section className="card">
            <h2 className="card-title">出错了</h2>
            <p className="error">{error}</p>
          </section>
        ) : (
          <section className="card">
            <p className="muted">加载任务中…</p>
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="report-page">
      <TopNav jobId={job.id} />

      {job.status === "error" ? (
        <section className="card">
          <h2 className="card-title">分析失败</h2>
          <p className="error">{job.error || "未知错误。"}</p>
        </section>
      ) : job.status === "await_confirm" && job.pending_fingerprint ? (
        <FingerprintEditor fingerprint={job.pending_fingerprint} onConfirm={onConfirm} />
      ) : job.status === "done" ? (
        <ReportView job={job} />
      ) : (
        <StageProgress job={job} />
      )}

      {/* 非终态时的瞬时连接错误提示（仍在重试）。 */}
      {error && !isTerminal(job.status) ? (
        <p className="error small">连接异常：{error}（正在重试…）</p>
      ) : null}
    </div>
  );
}

function TopNav({ jobId }: { jobId: string }) {
  return (
    <div className="report-top">
      <a href="/" className="link-btn">
        ← 返回重新提交
      </a>
      <span className="muted small mono">任务 {jobId}</span>
    </div>
  );
}
