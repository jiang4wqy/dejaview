"use client";

import { useState } from "react";
import type {
  Candidate,
  Cost,
  Improvement,
  Job,
  ProjectFingerprint,
  Report,
  Tone,
} from "@/lib/types";
import Markdown from "./Markdown";
import FindingCard from "./FindingCard";

const LEVEL_LABEL: Record<string, string> = {
  high: "高",
  medium: "中",
  low: "低",
};

// 重复度百分比：容错处理，score 可能是 0..1 的小数或 0..100 的整数。
function toPercent(score: number): number {
  const n = score <= 1 ? score * 100 : score;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function dupLevel(pct: number): string {
  if (pct >= 66) return "high";
  if (pct >= 33) return "mid";
  return "low";
}

function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function ToneToggle({
  available,
  tone,
  onChange,
}: {
  available: Tone[];
  tone: Tone;
  onChange: (t: Tone) => void;
}) {
  return (
    <div className="toggle" role="tablist" aria-label="语气切换">
      <button
        type="button"
        role="tab"
        aria-selected={tone === "serious"}
        className={tone === "serious" ? "active" : ""}
        disabled={!available.includes("serious")}
        onClick={() => onChange("serious")}
      >
        认真
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={tone === "roast"}
        className={tone === "roast" ? "active" : ""}
        disabled={!available.includes("roast")}
        onClick={() => onChange("roast")}
      >
        毒舌
      </button>
    </div>
  );
}

function CostMeter({ cost }: { cost: Cost }) {
  if (!cost) return null;
  return (
    <div className="cost-meter" title="本次分析的资源开销">
      <span>LLM 调用 {cost.llm_calls}</span>
      <span>·</span>
      <span>输入 {formatTokens(cost.input_tokens)} tokens</span>
      <span>·</span>
      <span>输出 {formatTokens(cost.output_tokens)} tokens</span>
      <span>·</span>
      <span>搜索 {cost.search_queries} 次</span>
      <span>·</span>
      <span>{(cost.seconds ?? 0).toFixed(1)}s</span>
    </div>
  );
}

function CandidateCard({ c }: { c: Candidate }) {
  const ref = c.ref;
  return (
    <div className="candidate">
      <div className="candidate-head">
        {ref?.url ? (
          <a href={ref.url} target="_blank" rel="noreferrer noopener" className="candidate-name">
            {ref?.name || ref.url}
          </a>
        ) : (
          <span className="candidate-name">{ref?.name || "未知项目"}</span>
        )}
        {ref?.source ? <span className="tag">{ref.source}</span> : null}
        {c.relation ? <span className="tag tag-accent">{c.relation}</span> : null}
        {c.confidence ? (
          <span className="conf">置信度 {LEVEL_LABEL[c.confidence] ?? c.confidence}</span>
        ) : null}
      </div>
      {ref?.why_surfaced ? (
        <p className="muted small">为何相关：{ref.why_surfaced}</p>
      ) : null}
      {ref?.snippet ? <p className="candidate-snippet">{ref.snippet}</p> : null}
      {c.notes ? <p className="finding-detail">{c.notes}</p> : null}
    </div>
  );
}

function ImprovementCard({ imp }: { imp: Improvement }) {
  const evidence = imp.evidence ?? [];
  return (
    <div className="improvement">
      <div className="finding-head">
        <span className="finding-title">{imp.title}</span>
        {imp.impact ? (
          <span className="badge impact">影响 {LEVEL_LABEL[imp.impact] ?? imp.impact}</span>
        ) : null}
        {imp.cost ? (
          <span className="badge cost">成本 {LEVEL_LABEL[imp.cost] ?? imp.cost}</span>
        ) : null}
      </div>
      {imp.rationale ? <p className="finding-detail">{imp.rationale}</p> : null}
      {imp.learn_from?.length ? (
        <p className="muted small">可借鉴：{imp.learn_from.join("、")}</p>
      ) : null}
      {evidence.length ? (
        <details className="evidence-details">
          <summary className="link-btn">点开证据 ({evidence.length})</summary>
          <ul className="evidence-list">
            {evidence.map((ev, i) => (
              <li key={i} className="evidence">
                <div className="evidence-meta">
                  {ev.source_type ? <span className="tag">{ev.source_type}</span> : null}
                  {ev.locator ? <span className="evidence-locator">{ev.locator}</span> : null}
                </div>
                {ev.quote ? <blockquote className="evidence-quote">{ev.quote}</blockquote> : null}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

function FingerprintSummary({ fp }: { fp: ProjectFingerprint }) {
  return (
    <section className="card">
      <h3 className="card-title">项目指纹</h3>
      <div className="kv">
        <div className="kv-row">
          <span className="kv-k">一句话简介</span>
          <span className="kv-v">{fp.one_liner || "—"}</span>
        </div>
        <div className="kv-row">
          <span className="kv-k">目标用户</span>
          <span className="kv-v">{fp.target_users || "—"}</span>
        </div>
        <div className="kv-row">
          <span className="kv-k">解决的问题</span>
          <span className="kv-v">{fp.problem || "—"}</span>
        </div>
        <div className="kv-row">
          <span className="kv-k">输入 / 处理 / 输出</span>
          <span className="kv-v">
            {[fp.io?.input, fp.io?.processing, fp.io?.output].filter(Boolean).join(" → ") || "—"}
          </span>
        </div>
        <div className="kv-row">
          <span className="kv-k">功能签名</span>
          <span className="kv-v">{fp.functional_signature || "—"}</span>
        </div>
        <div className="kv-row">
          <span className="kv-k">商业模式</span>
          <span className="kv-v">{fp.business_model || "—"}</span>
        </div>
      </div>

      {fp.core_features?.length ? (
        <>
          <h4 className="mini-title">核心功能</h4>
          <div className="chips">
            {fp.core_features.map((f, i) => (
              <span key={i} className="chip">
                {f}
              </span>
            ))}
          </div>
        </>
      ) : null}

      {fp.claimed_novelty?.length ? (
        <>
          <h4 className="mini-title">宣称的创新点</h4>
          <ul className="bullet">
            {fp.claimed_novelty.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </>
      ) : null}

      {fp.observed_differentiators?.length ? (
        <>
          <h4 className="mini-title">观察到的差异点</h4>
          <ul className="bullet">
            {fp.observed_differentiators.map((d, i) => (
              <li key={i}>
                {d.description}{" "}
                <span className={`badge ${d.proven ? "impact" : "cost"}`}>
                  {d.proven ? "已验证" : "未验证"}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}

export default function ReportView({ job }: { job: Job }) {
  const reports = job.reports ?? {};
  const available: Tone[] = [];
  if (reports.serious) available.push("serious");
  if (reports.roast) available.push("roast");

  const [tone, setTone] = useState<Tone>(available[0] ?? "serious");
  // 前端切换：直接从已获取的两份报告里取，不重新请求后端。
  const report: Report | undefined = reports[tone] ?? reports.serious ?? reports.roast;

  const result = job.result;
  const dup = result?.duplication;
  const dupPct = dup ? toPercent(dup.duplication_score) : null;

  if (!report) {
    return (
      <section className="card">
        <p className="muted">报告数据缺失。</p>
      </section>
    );
  }

  return (
    <div className="report">
      {/* 头部：标题 + 语气切换 + 重复度徽标 */}
      <section className="card">
        <div className="report-headline-row">
          <h1 className="headline">{report.headline}</h1>
          <ToneToggle available={available} tone={tone} onChange={setTone} />
        </div>

        <div className="badges-row">
          {dupPct !== null ? (
            <span className={`badge-dup ${dupLevel(dupPct)}`}>
              重复造轮子概率 {dupPct}%
            </span>
          ) : null}
          {dup?.confidence ? (
            <span className="conf">裁判置信度 {LEVEL_LABEL[dup.confidence] ?? dup.confidence}</span>
          ) : null}
        </div>

        {dup?.search_scope_note ? (
          <p className="scope-note">搜索范围说明：{dup.search_scope_note}</p>
        ) : null}
      </section>

      {/* 正文 Markdown */}
      <section className="card">
        <Markdown text={report.body_markdown} />
      </section>

      {/* 锐评要点（随语气切换的 findings） */}
      {report.findings?.length ? (
        <section className="card">
          <h3 className="card-title">锐评要点</h3>
          <div className="finding-list">
            {report.findings.map((f) => (
              <FindingCard key={f.id} finding={f} />
            ))}
          </div>
        </section>
      ) : null}

      {/* 重复度裁判细节 */}
      {dup ? (
        <section className="card">
          <h3 className="card-title">重复度裁判</h3>
          {dup.rationale ? <p className="finding-detail">{dup.rationale}</p> : null}

          {dup.dimensions && Object.keys(dup.dimensions).length ? (
            <>
              <h4 className="mini-title">各维度相似度</h4>
              <div className="dims">
                {Object.entries(dup.dimensions).map(([k, v]) => {
                  const p = toPercent(v);
                  return (
                    <div key={k} className="dim">
                      <div className="dim-head">
                        <span>{k}</span>
                        <span className="muted">{p}%</span>
                      </div>
                      <div className="progress-track slim">
                        <div className={`progress-fill ${dupLevel(p)}`} style={{ width: `${p}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : null}

          {dup.novelty?.length ? (
            <>
              <h4 className="mini-title">新意点</h4>
              <ul className="bullet">
                {dup.novelty.map((n, i) => (
                  <li key={i}>
                    <span className="tag tag-accent">{n.type}</span> {n.description}
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {dup.top_similar?.length ? (
            <>
              <h4 className="mini-title">最相似项目</h4>
              <div className="chips">
                {dup.top_similar.map((s, i) => (
                  <span key={i} className="chip">
                    {s}
                  </span>
                ))}
              </div>
            </>
          ) : null}
        </section>
      ) : null}

      {/* 相似项目候选 */}
      {result?.candidates?.length ? (
        <section className="card">
          <h3 className="card-title">相似项目候选（{result.candidates.length}）</h3>
          <div className="candidate-list">
            {result.candidates.map((c, i) => (
              <CandidateCard key={i} c={c} />
            ))}
          </div>
        </section>
      ) : null}

      {/* 亮点 / 问题（来自结果的事实层，语气无关） */}
      {result?.strengths?.length ? (
        <section className="card">
          <h3 className="card-title">亮点</h3>
          <div className="finding-list">
            {result.strengths.map((f) => (
              <FindingCard key={f.id} finding={f} />
            ))}
          </div>
        </section>
      ) : null}

      {result?.issues?.length ? (
        <section className="card">
          <h3 className="card-title">问题</h3>
          <div className="finding-list">
            {result.issues.map((f) => (
              <FindingCard key={f.id} finding={f} />
            ))}
          </div>
        </section>
      ) : null}

      {/* 改进建议 */}
      {result?.improvements?.length ? (
        <section className="card">
          <h3 className="card-title">改进建议</h3>
          <div className="improvement-list">
            {result.improvements.map((imp) => (
              <ImprovementCard key={imp.id} imp={imp} />
            ))}
          </div>
        </section>
      ) : null}

      {/* 项目指纹汇总 */}
      {result?.fingerprint ? <FingerprintSummary fp={result.fingerprint} /> : null}

      {/* 开销计量（低调展示） */}
      <CostMeter cost={job.cost} />
    </div>
  );
}
