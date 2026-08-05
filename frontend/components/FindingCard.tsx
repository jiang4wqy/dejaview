"use client";

import { useState } from "react";
import type { Evidence, Finding } from "@/lib/types";

const SEVERITY_LABEL: Record<string, string> = {
  critical: "致命",
  high: "严重",
  medium: "中等",
  low: "轻微",
  info: "提示",
};

const CONF_LABEL: Record<string, string> = {
  high: "高",
  medium: "中",
  low: "低",
};

function EvidenceItem({ ev }: { ev: Evidence }) {
  return (
    <li className="evidence">
      <div className="evidence-meta">
        {ev.source_type ? <span className="tag">{ev.source_type}</span> : null}
        {ev.locator ? (
          <span className="evidence-locator" title={ev.locator}>
            {ev.locator}
          </span>
        ) : null}
        {ev.confidence ? (
          <span className="conf">置信度 {CONF_LABEL[ev.confidence] ?? ev.confidence}</span>
        ) : null}
      </div>
      {ev.quote ? <blockquote className="evidence-quote">{ev.quote}</blockquote> : null}
      {ev.note ? <p className="muted small">{ev.note}</p> : null}
    </li>
  );
}

// 单条"发现"，可点击"点开证据"展开其 evidence[]。
export default function FindingCard({ finding }: { finding: Finding }) {
  const [open, setOpen] = useState(false);
  const evidence = finding.evidence ?? [];
  const sevClass = `sev sev-${finding.severity || "info"}`;

  return (
    <div className="finding">
      <div className="finding-head">
        <span className={sevClass}>
          {SEVERITY_LABEL[finding.severity] ?? finding.severity ?? "提示"}
        </span>
        <span className="finding-title">{finding.title}</span>
        {finding.category ? <span className="tag">{finding.category}</span> : null}
        {finding.confidence ? (
          <span className="conf">
            置信度 {CONF_LABEL[finding.confidence] ?? finding.confidence}
          </span>
        ) : null}
      </div>

      {finding.detail ? <p className="finding-detail">{finding.detail}</p> : null}

      {evidence.length > 0 ? (
        <div className="evidence-wrap">
          <button
            type="button"
            className="link-btn"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
          >
            {open ? "收起证据" : `点开证据 (${evidence.length})`}
          </button>
          {open ? (
            <ul className="evidence-list">
              {evidence.map((ev, i) => (
                <EvidenceItem key={i} ev={ev} />
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <p className="muted small">暂无证据</p>
      )}
    </div>
  );
}
