"use client";

import { useState } from "react";
import type { Finding } from "@/lib/types";
import { useLang, type TFunc } from "@/lib/i18n";

// severity → 展示类名 + 标签。契约值：strength | info | minor | major | critical。
function severityInfo(severity: string, t: TFunc): { cls: string; label: string } {
  switch (severity) {
    case "critical": return { cls: "critical", label: t("severity.critical") };
    case "major": return { cls: "major", label: t("severity.major") };
    case "minor": return { cls: "minor", label: t("severity.minor") };
    case "info": return { cls: "info", label: t("severity.info") };
    case "strength": return { cls: "good", label: t("severity.strength") };
    default: return { cls: "info", label: severity || t("severity.info") };
  }
}

// evidence.source_type → 标签。
function sourceLabel(sourceType: string, t: TFunc): string {
  switch (sourceType) {
    case "website": return t("source.website");
    case "github_readme": return t("source.github_readme");
    case "github_code": return t("source.github_code");
    case "github_config": return t("source.github_config");
    case "github_meta": return t("source.github_meta");
    case "search_result": return t("source.search_result");
    case "author_claim": return t("source.author_claim");
    case "metric": return t("source.metric");
    default: return sourceType;
  }
}

function levelLabel(level: string, t: TFunc): string {
  switch (level) {
    case "high": return t("level.high");
    case "medium": return t("level.medium");
    case "low": return t("level.low");
    default: return level;
  }
}

// 单条"物证"卡片：点击标题行展开其 evidence[]（点开物证）。
export default function FindingCard({ finding }: { finding: Finding }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const evidence = finding.evidence ?? [];
  const sev = severityInfo(finding.severity, t);

  return (
    <div className={`exhibit ${open ? "open" : ""}`}>
      <button
        type="button"
        className="ex-head"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={`sev ${sev.cls}`}>{sev.label}</span>
        <span className="ex-title">{finding.title}</span>
        {finding.confidence ? (
          <span className="ex-meta">{t("finding.confidencePrefix", { level: levelLabel(finding.confidence, t) })}</span>
        ) : null}
        <span className="ex-toggle">{open ? t("finding.collapse") : t("finding.expand")}</span>
      </button>

      <div className="ex-body">
        <div className="inner">
          {finding.detail ? <p style={{ margin: "0 0 4px" }}>{finding.detail}</p> : null}
          {evidence.length > 0 ? (
            evidence.map((ev, i) => (
              <div key={i} className="evi">
                <div className="tag">
                  {t("finding.evidencePrefix", { source: sourceLabel(ev.source_type, t) })}
                  {ev.confidence ? t("finding.confSuffix", { level: levelLabel(ev.confidence, t) }) : ""}
                </div>
                {ev.locator ? <div className="loc">{ev.locator}</div> : null}
                {ev.quote ? <div className="q">“{ev.quote}”</div> : null}
                {ev.note ? <div className="note">{ev.note}</div> : null}
              </div>
            ))
          ) : (
            <p className="q" style={{ margin: "8px 0 0" }}>
              {t("finding.noEvidence")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
