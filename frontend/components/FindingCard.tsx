"use client";

import { useState } from "react";
import type { Finding } from "@/lib/types";

// severity → 展示类名 + 中文标签。契约值：strength | info | minor | major | critical。
const SEVERITY: Record<string, { cls: string; label: string }> = {
  critical: { cls: "critical", label: "致命" },
  major: { cls: "major", label: "重要" },
  minor: { cls: "minor", label: "次要" },
  info: { cls: "info", label: "提示" },
  strength: { cls: "good", label: "优点" },
};

// evidence.source_type → 中文标签。
const SOURCE_LABEL: Record<string, string> = {
  website: "网站",
  github_readme: "README",
  github_code: "代码",
  github_config: "配置",
  github_meta: "仓库信息",
  search_result: "检索",
  author_claim: "作者声明",
  metric: "指标",
};

const CONF_LABEL: Record<string, string> = { high: "高", medium: "中", low: "低" };

// 单条"物证"卡片：点击标题行展开其 evidence[]（点开物证）。
export default function FindingCard({ finding }: { finding: Finding }) {
  const [open, setOpen] = useState(false);
  const evidence = finding.evidence ?? [];
  const sev = SEVERITY[finding.severity] ?? { cls: "info", label: finding.severity || "提示" };

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
          <span className="ex-meta">置信 {CONF_LABEL[finding.confidence] ?? finding.confidence}</span>
        ) : null}
        <span className="ex-toggle">{open ? "收起物证 ▾" : "点开物证 ▸"}</span>
      </button>

      <div className="ex-body">
        <div className="inner">
          {finding.detail ? <p style={{ margin: "0 0 4px" }}>{finding.detail}</p> : null}
          {evidence.length > 0 ? (
            evidence.map((ev, i) => (
              <div key={i} className="evi">
                <div className="tag">
                  物证 · {SOURCE_LABEL[ev.source_type] ?? ev.source_type}
                  {ev.confidence ? ` · 置信 ${CONF_LABEL[ev.confidence] ?? ev.confidence}` : ""}
                </div>
                {ev.locator ? <div className="loc">{ev.locator}</div> : null}
                {ev.quote ? <div className="q">“{ev.quote}”</div> : null}
                {ev.note ? <div className="note">{ev.note}</div> : null}
              </div>
            ))
          ) : (
            <p className="q" style={{ margin: "8px 0 0" }}>
              （暂无可点开的物证）
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
