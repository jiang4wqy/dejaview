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

const LEVEL_LABEL: Record<string, string> = { high: "高", medium: "中", low: "低" };

// 维度 key → 中文标签 + 展示顺序（契约固定六维）。
const DIM_LABEL: Record<string, string> = {
  same_problem: "同一问题",
  same_users: "同一用户",
  same_io_flow: "输入输出/工作流",
  feature_overlap: "功能重合",
  same_mechanism: "核心机制",
  unique_proven: "独有且已证明",
};
const DIM_ORDER = [
  "same_problem",
  "same_users",
  "same_io_flow",
  "feature_overlap",
  "same_mechanism",
  "unique_proven",
];

// relation → 展示皮肤 + 中文（仅 direct_competitor 用告警色）。
const RELATION: Record<string, { cls: string; label: string }> = {
  direct_competitor: { cls: "direct", label: "直接竞品" },
  alternative: { cls: "adj", label: "替代方案" },
  adjacent: { cls: "adj", label: "相邻" },
  abandoned: { cls: "adj", label: "已停更" },
  superficial: { cls: "adj", label: "表面相似" },
};

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
function verdictStamp(pct: number, tone: Tone): string {
  const roast = tone === "roast";
  if (pct >= 60) return roast ? "又一个轮子" : "疑似重复";
  if (pct >= 40) return roast ? "撞车预警" : "似曾相识";
  return roast ? "居然有点东西" : "有点东西";
}

// 从请求派生"被告项目"的显示名（仅用于卷宗抬头，纯装饰）。
function subjectName(job: Job): string {
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
  return "本项目";
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
  return (
    <div className="dial" aria-label={`重复造轮子概率 ${pct}%`} role="img">
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
        <div className="cap">重复造轮子概率</div>
        {confidence ? (
          <div className="conf">置信度 · {LEVEL_LABEL[confidence] ?? confidence}</div>
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
  const opts: { v: Tone; label: string }[] = [
    { v: "serious", label: "认真" },
    { v: "roast", label: "毒舌" },
    { v: "comfort", label: "安慰" },
  ];
  return (
    <div className="tonerow">
      <span className="tonetip">同一份事实，三副嘴脸 →</span>
      <div className="toggle t3" data-sel={tone} role="group" aria-label="语气">
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
  const ref = c.ref;
  const rel = RELATION[c.relation] ?? { cls: "adj", label: c.relation || "相关" };
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
          ref?.name || "未知项目"
        )}
      </h3>
      {typeof ref?.stars === "number" ? (
        <p className="cand-meta">
          ⭐ {fmtStars(ref.stars)}
          {ref.last_active ? ` · 最近 ${ref.last_active.slice(0, 7)}` : ""}
        </p>
      ) : null}
      {desc ? <p>{desc}</p> : null}
      {ref?.why_surfaced ? <p className="why">为何相关 · {ref.why_surfaced}</p> : null}
    </div>
  );
}

/* -------------------------------- 改进条目 -------------------------------- */
function ImprovementRow({ imp, n }: { imp: Improvement; n: number }) {
  return (
    <div className="imp">
      <div className="n">{n}</div>
      <div>
        <div className="t">{imp.title}</div>
        {imp.rationale ? <div className="r">{imp.rationale}</div> : null}
        {imp.learn_from?.length ? (
          <div className="learn">可借鉴 · {imp.learn_from.join("、")}</div>
        ) : null}
        <div className="chips">
          {imp.impact ? (
            <span className={`chip ${imp.impact === "high" ? "hi" : ""}`}>
              影响 {LEVEL_LABEL[imp.impact] ?? imp.impact}
            </span>
          ) : null}
          {imp.cost ? (
            <span className="chip">成本 {LEVEL_LABEL[imp.cost] ?? imp.cost}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ 项目指纹卡 ------------------------------ */
function FingerprintCard({ fp, embedded }: { fp: ProjectFingerprint; embedded?: boolean }) {
  const rows: [string, string][] = [];
  if (fp.problem) rows.push(["解决的问题", fp.problem]);
  if (fp.target_users) rows.push(["目标用户", fp.target_users]);
  if (fp.business_model) rows.push(["商业模式", fp.business_model]);
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
        <h2>项目指纹</h2>
        <span className="line" />
        <span className="eyebrow">我们理解的你 · 把握 {LEVEL_LABEL[fp.confidence] ?? fp.confidence}</span>
      </div>
      {body}
    </section>
  );
}

/* --------------------- 新意 / 存疑 / 未知（诚实台账） --------------------- */
// 把流水线算出但过去藏起来的三样东西摆上台面: 真新意、声称与事实的冲突、尚未确定项。
// 呼应锁定原则"缺证据就诚实降置信"—— 毒舌不新增未经核实的结论。
function HonestyLedger({ dup, fp, embedded }: { dup?: Duplication; fp: ProjectFingerprint; embedded?: boolean }) {
  const novel = [
    ...(dup?.novelty ?? []).map((n) => ({ tag: n.type, text: n.description })),
    ...(fp.observed_differentiators ?? [])
      .filter((d) => d.proven)
      .map((d) => ({ tag: "已证实", text: d.description })),
  ].filter((n) => n.text);
  const conflicts = (fp.conflicts ?? []).filter(Boolean);
  const unknowns = (fp.unknowns ?? []).filter(Boolean);
  if (!novel.length && !conflicts.length && !unknowns.length) return null;
  const body = (
      <div className="ledger">
        <div className="led-col ok">
          <div className="led-h">真正的新意</div>
          {novel.length ? (
            novel.map((n, i) => (
              <div key={i} className="led-row">
                {n.tag ? <b>{n.tag}</b> : null}
                {n.text}
              </div>
            ))
          ) : (
            <div className="led-row muted">未发现明确差异化</div>
          )}
        </div>
        <div className="led-col warn">
          <div className="led-h">声称 vs 事实</div>
          {conflicts.length ? (
            conflicts.map((c, i) => (
              <div key={i} className="led-row">
                {c}
              </div>
            ))
          ) : (
            <div className="led-row muted">无明显冲突</div>
          )}
        </div>
        <div className="led-col unk">
          <div className="led-h">尚未确定</div>
          {unknowns.length ? (
            unknowns.map((u, i) => (
              <div key={i} className="led-row">
                {u}
              </div>
            ))
          ) : (
            <div className="led-row muted">关键信息基本齐全</div>
          )}
        </div>
      </div>
  );
  if (embedded) return body;
  return (
    <section className="block">
      <div className="shead">
        <h2>新意 · 存疑 · 未知</h2>
        <span className="line" />
        <span className="eyebrow">缺证据就降置信，不硬编</span>
      </div>
      {body}
    </section>
  );
}

/* -------------------------------- 折叠块 + 一句话总结 -------------------------------- */
function Fold({ title, hint, defaultOpen = false, children }: {
  title: string; hint?: string; defaultOpen?: boolean; children: ReactNode;
}) {
  return (
    <details className="fold" data-reveal open={defaultOpen}>
      <summary className="fold-sum">
        <span className="fold-chev" aria-hidden="true">▸</span>
        <span className="fold-title">{title}</span>
        {hint ? <span className="fold-hint">{hint}</span> : null}
        <span className="fold-toggle">展开 / 收起</span>
      </summary>
      <div className="fold-body">{children}</div>
    </details>
  );
}

// 一句话总结：按重复度分档 + 语气。毒舌=段子暴击，镀金=装腔投资人，彩虹=无条件夸。
function summaryLine(pct: number, tone: Tone): string {
  if (tone === "comfort")
    return "🌈 别管那些数字啦——你能把想法真做出来，这份勇气就已经赢过一大半人了，超棒的！";
  const roast = tone === "roast";
  if (pct >= 60)
    return roast
      ? "别自欺了——这基本就是个轮子，市面上一抓一大把。"
      : "评级：Pass。同一盘菜的第 N 次加热，这个 valuation 我笑而不语。";
  if (pct >= 40)
    return roast
      ? "似曾相识——你是有点东西，但撞车的地方也真不少。"
      : "评级：观望。有点意思，可护城河呢？call me when you have traction。";
  return roast
    ? "行，居然有点东西——守住这点不一样，别浪费了。"
    : "评级：可以聊。至少不是又一个轮子——但想让我投，还差得远。";
}

function fmtStars(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(n);
}

// 赛道信号(确定性, 无 LLM): 从竞品的 star/活跃度派生"该不该继续"的半只脚。
function trackSignal(candidates: Candidate[] | undefined): { tag: string; text: string } | null {
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
    return { tag: "赛道成熟 · 拥挤", text: `已有多个直接竞品，最高 ${fmtStars(maxStars)}★ 且还在更新——硬刚很难，值得做的前提是找到真差异化或够窄的细分。` };
  if (gh.length && alive < 0.25)
    return { tag: "竞品大多停更", text: `搜到的同类大多很久没动静了——可能有空位，但先想清楚"为什么没人接着做"。` };
  if (direct === 0 && maxStars < 1000)
    return { tag: "赛道还没挤", text: `本轮没撞到高热度的直接竞品——有机会，但先去验证是真需求还是伪需求。` };
  return { tag: "赛道信号", text: `直接竞品 ${direct} 个，最高 ${fmtStars(maxStars)}★——不算空白，也没被锁死，差异化做对了有戏。` };
}

/* -------------------------------- 成本页脚 -------------------------------- */
function CostFooter({ job }: { job: Job }) {
  const cost: Cost | undefined = job.cost;
  const sources: string[] = [];
  if (job.request?.website_url) sources.push("网站");
  if (job.request?.github_url) sources.push("仓库");
  return (
    <>
      <div className="cost">
        {cost ? (
          <>
            <span>{cost.llm_calls} 次调用</span>
            <span>~{formatTokens((cost.input_tokens ?? 0) + (cost.output_tokens ?? 0))} tokens</span>
            <span>{cost.search_queries} 次检索</span>
            <span>{(cost.seconds ?? 0).toFixed(0)}s</span>
          </>
        ) : null}
        {sources.length ? <span>数据源 · {sources.join(" + ")}</span> : null}
        {job.degradations?.length ? <span>降级 {job.degradations.length} 项</span> : null}
      </div>
      <footer className="report-footer">
        DejaView · 证据化项目锐评 ——{" "}
        <b>刻薄可以主观，事实不能主观；锐评项目，不攻击开发者本人。</b>
      </footer>
    </>
  );
}

/* ================================ 报告主体 ================================ */
export default function ReportView({ job }: { job: Job }) {
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
        <p className="muted">报告数据缺失。</p>
      </div>
    );
  }

  // 事实层（共享，语气无关）：问题在前、优点在后。切换语气不改这里。
  const findings = [...(result?.issues ?? []), ...(result?.strengths ?? [])];
  const signal = trackSignal(result?.candidates);

  // 维度：已知顺序在前，未知 key 追加在后。
  const dims = dup?.dimensions ?? {};
  const dimKeys = [
    ...DIM_ORDER.filter((k) => k in dims),
    ...Object.keys(dims).filter((k) => !DIM_ORDER.includes(k)),
  ];

  return (
    <div className="dv" data-tone={tone}>
      {/* ---------- HERO ---------- */}
      <div className="hero rise">
        <div className={`stamp ${ignited ? "in" : ""}`}>{verdictStamp(pct, tone)}</div>
        <div className="hero-grid">
          <div>
            <div className="subject">
              // 卷宗 {caseNo(job)} · <b>{subjectName(job)}</b>
            </div>
            <h1 className="verdict">{report.headline}</h1>
          </div>
          <Dial pct={pct} confidence={dup?.confidence} dialNum={dialNum} ignited={ignited} />
        </div>
        <ToneToggle available={available} tone={tone} onChange={setTone} />
        <div className="hero-actions">
          <button type="button" className="share-btn" onClick={() => setShareOpen(true)}>
            📸 生成战报 · 分享
          </button>
        </div>
      </div>

      {/* ---------- 核心总结（最重要，放最显眼） ---------- */}
      <section className="block summary rise" style={{ animationDelay: ".06s" }}>
        <div className="shead">
          <span className="eyebrow">
            {tone === "roast" ? "// 一句话，别绕弯" : tone === "comfort" ? "// 抱抱你 · 纯情绪价值" : "// 一句话总结"}
          </span>
          <span className="line" />
          <span className="eyebrow">重复度 {pct}%</span>
        </div>
        <p className="summary-line">{report.verdict_line || summaryLine(pct, tone)}</p>
        {report.top_fix || result?.improvements?.[0] ? (
          <div className="summary-do">
            <span className="summary-do-k">
              {tone === "roast" ? "先补最露怯的一处" : tone === "comfort" ? "顺手加一点点就更棒" : "想让我投，先做这个"}
            </span>
            <span className="summary-do-v">
              {report.top_fix || result?.improvements?.[0]?.title}
            </span>
          </div>
        ) : null}
        {report.why_line || dup?.rationale ? (
          <p className="summary-why">
            <b>{tone === "roast" ? "凭啥这么说 · " : tone === "comfort" ? "为什么你值得被夸 · " : "评级依据 · "}</b>
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
            <span className="ts-note">值不值得继续，光看"像不像"不够，也看竞品有多能打</span>
          </div>
          <p className="ts-text">{signal.text}</p>
        </section>
      ) : null}

      {/* ---------- 详情：默认折叠，需要再展开 ---------- */}
      <div className="folds rise" style={{ animationDelay: ".12s" }}>
        <div className="folds-hint">想看论证细节？逐条展开 ↓</div>

        {report.body_markdown ? (
          <Fold title={tone === "roast" ? "毒舌全文" : "评审全文"} hint="完整点评">
            <Markdown text={report.body_markdown} className="prose" />
          </Fold>
        ) : null}

        {result?.improvements?.length ? (
          <Fold title="改进优先级" hint="按 影响 × 成本">
            <div className="imps">
              {result.improvements.map((imp, i) => (
                <ImprovementRow key={imp.id} imp={imp} n={i + 1} />
              ))}
            </div>
          </Fold>
        ) : null}

        {dimKeys.length ? (
          <Fold title="重复度拆解" hint="0 独一份 · 1 完全重合">
            <div className="dims">
              {dimKeys.map((k) => {
                const v = dims[k];
                const p = toPercent(v);
                return (
                  <div key={k} className="dim">
                    <div className="k">
                      <span>{DIM_LABEL[k] ?? k}</span>
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
          <Fold title="项目指纹" hint="我们理解的你">
            <FingerprintCard fp={result.fingerprint} embedded />
          </Fold>
        ) : null}

        {result?.fingerprint ? (
          <Fold title="新意 · 存疑 · 未知" hint="缺证据就降置信">
            <HonestyLedger dup={dup} fp={result.fingerprint} embedded />
          </Fold>
        ) : null}

        {findings.length ? (
          <Fold title="问题与优点 · 物证" hint="每条可点开证据">
            <div>
              {findings.map((f) => (
                <FindingCard key={f.id} finding={f} />
              ))}
            </div>
          </Fold>
        ) : null}

        {result?.candidates?.length ? (
          <Fold title="对照物 · 召回竞品" hint={`${result.candidates.length} 个`}>
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
