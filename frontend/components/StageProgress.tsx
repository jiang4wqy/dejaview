import type { Job } from "@/lib/types";

// 阶段 key → 中文标签。
const STAGE_LABELS: Record<string, string> = {
  site_analysis: "分析网站",
  github_analysis: "分析仓库",
  fingerprint: "合成项目指纹",
  search: "搜索相似项目",
  verify: "验证候选",
  judge: "重复度裁判",
  factlayer: "汇总事实层",
  render: "生成报告",
  done: "完成",
};

// 阶段展示顺序。
const STAGE_ORDER = [
  "site_analysis",
  "github_analysis",
  "fingerprint",
  "search",
  "verify",
  "judge",
  "factlayer",
  "render",
  "done",
];

export default function StageProgress({ job }: { job: Job }) {
  const pct = Math.max(0, Math.min(100, Math.round((job.progress ?? 0) * 100)));
  const label = STAGE_LABELS[job.stage] ?? job.stage ?? "处理中";
  const statusText = job.status === "queued" ? "排队中" : "分析中";
  const currentIndex = STAGE_ORDER.indexOf(job.stage);

  return (
    <section className="card">
      <div className="progress-head">
        <span className="progress-stage">{label}</span>
        <span className="progress-pct">{pct}%</span>
      </div>

      <div
        className="progress-track"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>

      <p className="muted small">{statusText}… 页面会自动刷新，请勿关闭。</p>

      <ol className="stagelist">
        {STAGE_ORDER.map((key, i) => {
          const state =
            currentIndex < 0
              ? ""
              : i < currentIndex
                ? "done"
                : i === currentIndex
                  ? "active"
                  : "";
          return (
            <li key={key} className={`stage-item ${state}`}>
              <span className="stage-dot" aria-hidden="true" />
              <span className="stage-name">{STAGE_LABELS[key]}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
