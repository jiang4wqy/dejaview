"use client";

import { useEffect, useState, type ReactNode } from "react";
import type {
  Candidate,
  Cost,
  Duplication,
  Improvement,
  Job,
  ProjectFingerprint,
  Report,
  Tone,
} from "@/lib/types";
import Markdown from "./Markdown";
import FindingCard from "./FindingCard";
import ShareModal from "./ShareCard";
import { useTone } from "@/lib/tone";
import { useLang, type TFunc } from "@/lib/i18n";

function levelLabel(level: string | undefined, t: TFunc): string {
  switch (level) {
    case "high": return t("level.high");
    case "medium": return t("level.medium");
    case "low": return t("level.low");
    default: return level ?? "";
  }
}

// 维度 key → 标签 + 展示顺序（契约固定六维）。
function dimLabel(key: string, t: TFunc): string {
  switch (key) {
    case "same_problem": return t("dim.same_problem");
    case "same_users": return t("dim.same_users");
    case "same_io_flow": return t("dim.same_io_flow");
    case "feature_overlap": return t("dim.feature_overlap");
    case "same_mechanism": return t("dim.same_mechanism");
    case "unique_proven": return t("dim.unique_proven");
    default: return key;
  }
}
const DIM_ORDER = [
  "same_problem",
  "same_users",
  "same_io_flow",
  "feature_overlap",
  "same_mechanism",
  "unique_proven",
];

// relation → 展示皮肤 + 标签（仅 direct_competitor 用告警色）。
function relationInfo(relation: string, t: TFunc): { cls: string; label: string } {
  switch (relation) {
    case "direct_competitor": return { cls: "direct", label: t("relation.direct_competitor") };
    case "alternative": return { cls: "adj", label: t("relation.alternative") };
    case "adjacent": return { cls: "adj", label: t("relation.adjacent") };
    case "abandoned": return { cls: "adj", label: t("relation.abandoned") };
    case "superficial": return { cls: "adj", label: t("relation.superficial") };
    default: return { cls: "adj", label: relation || t("relation.fallback") };
  }
}

// score 容错：可能是 0..1 小数或 0..100 整数。
function toPercent(score: number): number {
  const n = score <= 1 ? score * 100 : score;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

// 印章文案：随重复度分档 + 语气变化（同一事实，两种嘴脸）。
function verdictStamp(pct: number, tone: Tone, t: TFunc): string {
  const roast = tone === "roast";
  if (pct >= 60) return roast ? t("verdictStamp.repeatRoast") : t("verdictStamp.repeat");
  if (pct >= 40) return roast ? t("verdictStamp.warnRoast") : t("verdictStamp.warn");
  return roast ? t("verdictStamp.okRoast") : t("verdictStamp.ok");
}

// 从请求派生"被告项目"的显示名（仅用于卷宗抬头，纯装饰）。
function subjectName(job: Job, t: TFunc): string {
  const gh = job.request?.github_url;
  const web = job.request?.website_url;
  if (gh) {
    const m = gh.match(/github\.com\/([^/]+\/[^/#?]+)/i);
    if (m) return m[1].replace(/\.git$/, "");
  }
  if (web) {
    try {
      return new URL(web).hostname.replace(/^www\./, "");
    } catch {
      /* 忽略非法 URL */
    }
  }
  if (gh) return gh;
  return t("report.subjectFallback");
}

function caseNo(job: Job): string {
  const slug = (job.id || "").replace(/[^a-z0-9]/gi, "").slice(0, 6).toUpperCase();
  return `DV-${slug || "000000"}`;
}

/* ---------------------------------- 表盘 ---------------------------------- */
function Dial({
  pct,
  confidence,
  dialNum,
  ignited,
}: {
  pct: number;
  confidence?: string;
  dialNum: number;
  ignited: boolean;
}) {
  const { t } = useLang();
  return (
    <div className="dial" aria-label={`${t("metric.dupProb")} ${pct}%`} role="img">
      <svg viewBox="0 0 200 200">
        <g className="dial-ticks">
          {Array.from({ length: 44 }).map((_, i) => (
            <line
              key={i}
              className={ignited && i < Math.round((pct / 100) * 44) ? "on" : ""}
              x1="196"
              y1="100"
              x2={i % 4 === 0 ? "185" : "190"}
              y2="100"
              transform={`rotate(${(i * 360) / 44} 100 100)`}
            />
          ))}
        </g>
        <circle className="track" cx="100" cy="100" r="82" />
        <circle
          className="val"
          cx="100"
          cy="100"
          r="82"
          pathLength={100}
          strokeDasharray={100}
          style={{ strokeDashoffset: ignited ? 100 - pct : 100 }}
        />
      </svg>
      <div className="center">
        <div className="pct">
          <span>{dialNum}</span>%
        </div>
        <div className="cap">{t("metric.dupProb")}</div>
        {confidence ? (
          <div className="conf">{t("metric.confidence", { level: levelLabel(confidence, t) })}</div>
        ) : null}
      </div>
    </div>
  );
}

/* -------------------------------- 语气切换 -------------------------------- */
function ToneToggle({
  available,
  tone,
  onChange,
}: {
  available: Tone[];
  tone: Tone;
  onChange: (t: Tone) => void;
}) {
  const { t } = useLang();
  const opts: { v: Tone; label: string }[] = [
    { v: "serious", label: t("tone.serious") },
    { v: "roast", label: t("tone.roast") },
    { v: "comfort", label: t("tone.comfort") },
  ];
  return (
    <div className="tonerow">
      <span className="tonetip">{t("tone.tip")}</span>
      <div className="toggle t3" data-sel={tone} role="group" aria-label={t("tone.ariaLabel")}>
        <span className="knob" aria-hidden="true" />
        {opts.map((o) => (
          <button
            key={o.v}
            type="button"
            aria-pressed={tone === o.v}
            disabled={!available.includes(o.v)}
            onClick={() => onChange(o.v)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------- 候选卡片 -------------------------------- */
function CandidateCard({ c }: { c: Candidate }) {
  const { t } = useLang();
  const ref = c.ref;
  const rel = relationInfo(c.relation, t);
  const desc = c.notes || ref?.snippet || "";
  return (
    <div className="cand">
      <span className={`rel ${rel.cls}`}>{rel.label}</span>
      <h3>
        {ref?.url ? (
          <a href={ref.url} target="_blank" rel="noreferrer noopener">
            {ref?.name || ref.url}
          </a>
        ) : (
          ref?.name || t("candidate.unknown")
        )}
      </h3>
      {typeof ref?.stars === "number" ? (
        <p className="cand-meta">
          ⭐ {fmtStars(ref.stars)}
          {ref.last_active ? ` · ${t("candidate.lastActivePrefix")} ${ref.last_active.slice(0, 7)}` : ""}
        </p>
      ) : null}
      {desc ? <p>{desc}</p> : null}
      {ref?.why_surfaced ? <p className="why">{t("candidate.whyPrefix")} {ref.why_surfaced}</p> : null}
    </div>
  );
}

/* -------------------------------- 改进条目 -------------------------------- */
function ImprovementRow({ imp, n }: { imp: Improvement; n: number }) {
  const { t, lang } = useLang();
  const sep = lang === "zh" ? "、" : ", ";
  return (
    <div className="imp">
      <div className="n">{n}</div>
      <div>
        <div className="t">{imp.title}</div>
        {imp.rationale ? <div className="r">{imp.rationale}</div> : null}
        {imp.learn_from?.length ? (
          <div className="learn">{t("improvement.learnFromPrefix")} {imp.learn_from.join(sep)}</div>
        ) : null}
        <div className="chips">
          {imp.impact ? (
            <span className={`chip ${imp.impact === "high" ? "hi" : ""}`}>
              {t("improvement.impactPrefix")} {levelLabel(imp.impact, t)}
            </span>
          ) : null}
          {imp.cost ? (
            <span className="chip">{t("improvement.costPrefix")} {levelLabel(imp.cost, t)}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ 项目指纹卡 ------------------------------ */
function FingerprintCard({ fp, embedded }: { fp: ProjectFingerprint; embedded?: boolean }) {
  const { t } = useLang();
  const rows: [string, string][] = [];
  if (fp.problem) rows.push([t("field.problem"), fp.problem]);
  if (fp.target_users) rows.push([t("field.targetUsers"), fp.target_users]);
  if (fp.business_model) rows.push([t("field.businessModel"), fp.business_model]);
  const body = (
      <div className="fp">
        {fp.one_liner ? <p className="fp-one">{fp.one_liner}</p> : null}
        {rows.length ? (
          <div className="fp-grid">
            {rows.map(([k, v]) => (
              <div key={k} className="fp-row">
                <span className="fp-k">{k}</span>
                <span>{v}</span>
              </div>
            ))}
          </div>
        ) : null}
        {fp.functional_signature ? (
          <div className="fp-sig mono">{fp.functional_signature}</div>
        ) : null}
        {fp.core_features?.length ? (
          <div className="fp-feats">
            {fp.core_features.map((f, i) => (
              <span key={i} className="feat">
                {f}
              </span>
            ))}
          </div>
        ) : null}
      </div>
  );
  if (embedded) return body;
  return (
    <section className="block">
      <div className="shead">
        <h2>{t("fp.blockTitle")}</h2>
        <span className="line" />
        <span className="eyebrow">{t("fp.eyebrow", { level: levelLabel(fp.confidence, t) })}</span>
      </div>
      {body}
    </section>
  );
}

/* --------------------- 新意 / 存疑 / 未知（诚实台账） --------------------- */
// 把流水线算出但过去藏起来的三样东西摆上台面: 真新意、声称与事实的冲突、尚未确定项。
// 呼应锁定原则"缺证据就诚实降置信"—— 毒舌不新增未经核实的结论。
function HonestyLedger({ dup, fp, embedded }: { dup?: Duplication; fp: ProjectFingerprint; embedded?: boolean }) {
  const { t } = useLang();
  const novel = [
    ...(dup?.novelty ?? []).map((n) => ({ tag: n.type, text: n.description })),
    ...(fp.observed_differentiators ?? [])
      .filter((d) => d.proven)
      .map((d) => ({ tag: t("ledger.provenTag"), text: d.description })),
  ].filter((n) => n.text);
  const conflicts = (fp.conflicts ?? []).filter(Boolean);
  const unknowns = (fp.unknowns ?? []).filter(Boolean);
  if (!novel.length && !conflicts.length && !unknowns.length) return null;
  const body = (
      <div className="ledger">
        <div className="led-col ok">
          <div className="led-h">{t("ledger.trueNovelty")}</div>
          {novel.length ? (
            novel.map((n, i) => (
              <div key={i} className="led-row">
                {n.tag ? <b>{n.tag}</b> : null}
                {n.text}
              </div>
            ))
          ) : (
            <div className="led-row muted">{t("ledger.emptyNovelty")}</div>
          )}
        </div>
        <div className="led-col warn">
          <div className="led-h">{t("ledger.claimVsFact")}</div>
          {conflicts.length ? (
            conflicts.map((c, i) => (
              <div key={i} className="led-row">
                {c}
              </div>
            ))
          ) : (
            <div className="led-row muted">{t("ledger.emptyConflict")}</div>
          )}
        </div>
        <div className="led-col unk">
          <div className="led-h">{t("ledger.unknownCol")}</div>
          {unknowns.length ? (
            unknowns.map((u, i) => (
              <div key={i} className="led-row">
                {u}
              </div>
            ))
          ) : (
            <div className="led-row muted">{t("ledger.emptyUnknown")}</div>
          )}
        </div>
      </div>
  );
  if (embedded) return body;
  return (
    <section className="block">
      <div className="shead">
        <h2>{t("ledger.title")}</h2>
        <span className="line" />
        <span className="eyebrow">{t("ledger.eyebrow")}</span>
      </div>
      {body}
    </section>
  );
}

/* -------------------------------- 折叠块 + 一句话总结 -------------------------------- */
function Fold({ title, hint, defaultOpen = false, children }: {
  title: string; hint?: string; defaultOpen?: boolean; children: ReactNode;
}) {
  const { t } = useLang();
  return (
    <details className="fold" data-reveal open={defaultOpen}>
      <summary className="fold-sum">
        <span className="fold-chev" aria-hidden="true">▸</span>
        <span className="fold-title">{title}</span>
        {hint ? <span className="fold-hint">{hint}</span> : null}
        <span className="fold-toggle">{t("fold.toggle")}</span>
      </summary>
      <div className="fold-body">{children}</div>
    </details>
  );
}

// 一句话总结：按重复度分档 + 语气。毒舌=段子暴击，镀金=装腔投资人，彩虹=无条件夸。
function summaryLine(pct: number, tone: Tone, t: TFunc): string {
  if (tone === "comfort") return t("summary.comfort");
  const roast = tone === "roast";
  if (pct >= 60) return roast ? t("summary.highRoast") : t("summary.highSerious");
  if (pct >= 40) return roast ? t("summary.midRoast") : t("summary.midSerious");
  return roast ? t("summary.lowRoast") : t("summary.lowSerious");
}

function fmtStars(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(n);
}

// 赛道信号(确定性, 无 LLM): 从竞品的 star/活跃度派生"该不该继续"的半只脚。
function trackSignal(candidates: Candidate[] | undefined, t: TFunc): { tag: string; text: string } | null {
  if (!candidates?.length) return null;
  const gh = candidates.filter((c) => c.ref.source === "github" && typeof c.ref.stars === "number");
  const direct = candidates.filter((c) => c.relation === "direct_competitor").length;
  if (!gh.length && !direct) return null;
  const maxStars = gh.length ? Math.max(...gh.map((c) => c.ref.stars as number)) : 0;
  const now = Date.now();
  const activeCnt = gh.filter(
    (c) => c.ref.last_active && now - new Date(c.ref.last_active).getTime() < 400 * 864e5,
  ).length;
  const alive = gh.length ? activeCnt / gh.length : 0;

  if (direct >= 2 && maxStars >= 3000 && alive >= 0.4)
    return { tag: t("signal.crowdedTag"), text: t("signal.crowdedText", { stars: fmtStars(maxStars) }) };
  if (gh.length && alive < 0.25)
    return { tag: t("signal.staleTag"), text: t("signal.staleText") };
  if (direct === 0 && maxStars < 1000)
    return { tag: t("signal.openTag"), text: t("signal.openText") };
  return { tag: t("signal.defaultTag"), text: t("signal.defaultText", { direct, stars: fmtStars(maxStars) }) };
}

/* -------------------------------- 成本页脚 -------------------------------- */
function CostFooter({ job }: { job: Job }) {
  const { t } = useLang();
  const cost: Cost | undefined = job.cost;
  const sources: string[] = [];
  if (job.request?.website_url) sources.push(t("cost.sourceWebsite"));
  if (job.request?.github_url) sources.push(t("cost.sourceRepo"));
  return (
    <>
      <div className="cost">
        {cost ? (
          <>
            <span>{t("cost.calls", { n: cost.llm_calls })}</span>
            <span>~{formatTokens((cost.input_tokens ?? 0) + (cost.output_tokens ?? 0))} tokens</span>
            <span>{t("cost.searches", { n: cost.search_queries })}</span>
            <span>{(cost.seconds ?? 0).toFixed(0)}s</span>
          </>
        ) : null}
        {sources.length ? <span>{t("cost.sourcesPrefix")} {sources.join(" + ")}</span> : null}
        {job.degradations?.length ? <span>{t("cost.degradations", { n: job.degradations.length })}</span> : null}
      </div>
      <footer className="report-footer">
        DejaView · {t("brand.tagline")} —— <b>{t("footer.mission")}</b>
      </footer>
    </>
  );
}

/* ================================ 报告主体 ================================ */
export default function ReportView({ job }: { job: Job }) {
  const { t, lang } = useLang();
  const reports = job.reports ?? {};
  const available: Tone[] = [];
  if (reports.serious) available.push("serious");
  if (reports.roast) available.push("roast");
  if (reports.comfort) available.push("comfort");

  // 语气来自全局世界主题：报告页的一键切换 → 整站在镀金/毒舌之间变形。
  const { tone: ctxTone, setTone } = useTone();
  const tone: Tone = ctxTone ?? (reports.serious ? "serious" : available[0] ?? "serious");
  useEffect(() => {
    if (!ctxTone) setTone(tone); // 直达报告页(无历史选择)时补一个默认世界
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctxTone]);

  const result = job.result;
  const dup = result?.duplication;
  const pct = dup ? toPercent(dup.duplication_score) : 0;

  // 载入动效：表盘填充 + 数字滚动 + 印章落章 + 维度条生长。
  const [ignited, setIgnited] = useState(false);
  const [dialNum, setDialNum] = useState(0);
  const [shareOpen, setShareOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  function copyReportLink() {
    navigator.clipboard?.writeText(window.location.href).then(
      () => {
        setLinkCopied(true);
        window.setTimeout(() => setLinkCopied(false), 1800);
      },
      () => { /* 忽略：剪贴板权限被拒等 */ },
    );
  }
  useEffect(() => {
    let raf = 0;
    let to: ReturnType<typeof setTimeout> | null = null;
    let iv: ReturnType<typeof setInterval> | null = null;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    raf = requestAnimationFrame(() => {
      to = setTimeout(() => {
        setIgnited(true);
        if (reduce || pct <= 0) {
          setDialNum(pct);
          return;
        }
        let n = 0;
        const step = Math.max(1, Math.round(pct / 34));
        iv = setInterval(() => {
          n += step;
          if (n >= pct) {
            n = pct;
            if (iv) clearInterval(iv);
          }
          setDialNum(n);
        }, 34);
      }, 180);
    });

    return () => {
      cancelAnimationFrame(raf);
      if (to) clearTimeout(to);
      if (iv) clearInterval(iv);
    };
  }, [pct]);

  // 报告落地：砸一发本世界特效
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (tone === "roast") window.__djBurst?.(window.innerWidth / 2, 170);
      else if (tone === "comfort") window.__djHearts?.(window.innerWidth / 2, 170);
      else window.__djGold?.();
    }, 480);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 滚动时逐段浮现
  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || typeof IntersectionObserver === "undefined") return;
    const els = Array.from(document.querySelectorAll<HTMLElement>(".dv [data-reveal]"));
    els.forEach((el) => el.classList.add("pre-reveal"));
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("revealed");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.1, rootMargin: "0px 0px -6% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // ?share=1 深链直接弹出战报
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("share") === "1") setShareOpen(true);
  }, []);

  const report: Report | undefined = reports[tone] ?? reports.serious ?? reports.roast;
  if (!report) {
    return (
      <div className="panel">
        <p className="muted">{t("report.notFound")}</p>
      </div>
    );
  }

  // 事实层（共享，语气无关）：问题在前、优点在后。切换语气不改这里。
  const findings = [...(result?.issues ?? []), ...(result?.strengths ?? [])];
  const signal = trackSignal(result?.candidates, t);

  // 维度：已知顺序在前，未知 key 追加在后。
  const dims = dup?.dimensions ?? {};
  const dimKeys = [
    ...DIM_ORDER.filter((k) => k in dims),
    ...Object.keys(dims).filter((k) => !DIM_ORDER.includes(k)),
  ];

  return (
    <div className="dv" data-tone={tone} lang={lang === "en" ? "en" : "zh-CN"}>
      {/* ---------- HERO ---------- */}
      <div className="hero rise">
        <div className="hero-grid">
          <div>
            <div className="subject">
              {t("hero.caseLine", { caseNo: caseNo(job) })} <b>{subjectName(job, t)}</b>
            </div>
            <h1 className="verdict">{report.headline}</h1>
          </div>
          <div className="dial-wrap">
            <Dial pct={pct} confidence={dup?.confidence} dialNum={dialNum} ignited={ignited} />
            <div className={`stamp ${ignited ? "in" : ""}`}>{verdictStamp(pct, tone, t)}</div>
          </div>
        </div>
        <ToneToggle available={available} tone={tone} onChange={setTone} />
        <div className="hero-actions">
          <button type="button" className="share-btn" onClick={() => setShareOpen(true)}>
            {t("hero.share")}
          </button>
          <button type="button" className="link-btn" onClick={copyReportLink}>
            {linkCopied ? t("hero.linkCopied") : t("hero.copyLink")}
          </button>
        </div>
      </div>

      {/* ---------- 核心总结（最重要，放最显眼） ---------- */}
      <section className="block summary rise" style={{ animationDelay: ".06s" }}>
        <div className="shead">
          <span className="eyebrow">
            {tone === "roast" ? t("summary.eyebrowRoast") : tone === "comfort" ? t("summary.eyebrowComfort") : t("summary.eyebrowSerious")}
          </span>
          <span className="line" />
          <span className="eyebrow">{t("summary.dupLabel", { pct })}</span>
        </div>
        <p className="summary-line">{report.verdict_line || summaryLine(pct, tone, t)}</p>
        {report.top_fix || result?.improvements?.[0] ? (
          <div className="summary-do">
            <span className="summary-do-k">
              {tone === "roast" ? t("summary.doKeyRoast") : tone === "comfort" ? t("summary.doKeyComfort") : t("summary.doKeySerious")}
            </span>
            <span className="summary-do-v">
              {report.top_fix || result?.improvements?.[0]?.title}
            </span>
          </div>
        ) : null}
        {report.why_line || dup?.rationale ? (
          <p className="summary-why">
            <b>{tone === "roast" ? t("summary.whyPrefixRoast") : tone === "comfort" ? t("summary.whyPrefixComfort") : t("summary.whyPrefixSerious")} </b>
            {report.why_line || dup?.rationale}
          </p>
        ) : null}
        {dup?.search_scope_note ? <div className="scope">{dup.search_scope_note}</div> : null}
      </section>

      {/* ---------- 赛道信号：该不该继续 ---------- */}
      {signal ? (
        <section className="block track-signal rise" style={{ animationDelay: ".09s" }}>
          <div className="ts-head">
            <span className="ts-tag">📡 {signal.tag}</span>
            <span className="ts-note">{t("signal.headNote")}</span>
          </div>
          <p className="ts-text">{signal.text}</p>
        </section>
      ) : null}

      {/* ---------- 详情：默认折叠，需要再展开 ---------- */}
      <div className="folds rise" style={{ animationDelay: ".12s" }}>
        <div className="folds-hint">{t("folds.hint")}</div>

        {report.body_markdown ? (
          <Fold title={tone === "roast" ? t("fold.roastFull") : t("fold.reviewFull")} hint={t("fold.completeReview")}>
            <Markdown text={report.body_markdown} className="prose" />
          </Fold>
        ) : null}

        {result?.improvements?.length ? (
          <Fold title={t("fold.improvements")} hint={t("fold.improvementsHint")}>
            <div className="imps">
              {result.improvements.map((imp, i) => (
                <ImprovementRow key={imp.id} imp={imp} n={i + 1} />
              ))}
            </div>
          </Fold>
        ) : null}

        {dimKeys.length ? (
          <Fold title={t("fold.dupBreakdown")} hint={t("fold.dupBreakdownHint")}>
            <div className="dims">
              {dimKeys.map((k) => {
                const v = dims[k];
                const p = toPercent(v);
                return (
                  <div key={k} className="dim">
                    <div className="k">
                      <span>{dimLabel(k, t)}</span>
                      <b>{(v <= 1 ? v : v / 100).toFixed(2)}</b>
                    </div>
                    <div className="bar">
                      <i style={{ width: `${p}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Fold>
        ) : null}

        {result?.fingerprint ? (
          <Fold title={t("fp.blockTitle")} hint={t("fold.fingerprintHint")}>
            <FingerprintCard fp={result.fingerprint} embedded />
          </Fold>
        ) : null}

        {result?.fingerprint ? (
          <Fold title={t("ledger.title")} hint={t("fold.ledgerHint")}>
            <HonestyLedger dup={dup} fp={result.fingerprint} embedded />
          </Fold>
        ) : null}

        {findings.length ? (
          <Fold title={t("fold.findings")} hint={t("fold.findingsHint")}>
            <div>
              {findings.map((f) => (
                <FindingCard key={f.id} finding={f} />
              ))}
            </div>
          </Fold>
        ) : null}

        {result?.candidates?.length ? (
          <Fold title={t("fold.candidates")} hint={t("fold.candidatesHint", { n: result.candidates.length })}>
            <div className="cands">
              {result.candidates.map((c, i) => (
                <CandidateCard key={i} c={c} />
              ))}
            </div>
          </Fold>
        ) : null}
      </div>

      {/* ---------- 成本 / 页脚 ---------- */}
      <CostFooter job={job} />

      {shareOpen ? (
        <ShareModal job={job} tone={tone} onClose={() => setShareOpen(false)} />
      ) : null}
    </div>
  );
}
