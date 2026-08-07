"use client";

// 分享战报：把报告核心做成一张海报卡，用 html-to-image 抓成 PNG 下载；并可复制公开链接。
// 客户端抓图 = 用浏览器自带中文字体渲染，规避服务端 OG(satori) 缺 CJK 字体的问题。
import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import type { Job, Tone } from "@/lib/types";
import { PERSONA } from "@/lib/tone";

function pct(v?: number): number {
  if (v == null) return 0;
  const n = v <= 1 ? v * 100 : v;
  return Math.round(Math.max(0, Math.min(100, n)));
}
function subjectName(job: Job): string {
  const gh = job.request?.github_url;
  const web = job.request?.website_url;
  if (gh) {
    const m = gh.match(/github\.com\/([^/]+\/[^/#?]+)/i);
    if (m) return m[1].replace(/\.git$/, "");
  }
  if (web) {
    try { return new URL(web).hostname.replace(/^www\./, ""); } catch { /* ignore */ }
  }
  return gh || "本项目";
}
function caseNo(job: Job): string {
  const slug = (job.id || "").replace(/[^a-z0-9]/gi, "").slice(0, 6).toUpperCase();
  return `DV-${slug || "000000"}`;
}

export default function ShareModal({ job, tone, onClose }: { job: Job; tone: Tone; onClose: () => void }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const report = job.reports?.[tone];
  const p = pct(job.result?.duplication?.duplication_score);
  const persona = PERSONA[tone];

  async function download() {
    if (!cardRef.current) return;
    setBusy(true);
    try {
      const url = await toPng(cardRef.current, {
        pixelRatio: 2, cacheBust: true, width: 1080, height: 1080,
        backgroundColor: tone === "comfort" ? "#ffe3f2" : tone === "roast" ? "#150a29" : "#0a0a0c",
      });
      const a = document.createElement("a");
      a.href = url;
      a.download = `DejaView-${subjectName(job).replace(/[^\w-]/g, "_")}-${tone}.png`;
      a.click();
    } catch (e) {
      console.error("生成战报失败", e);
    } finally {
      setBusy(false);
    }
  }
  function copyLink() {
    const link = `${window.location.origin}/report/${job.id}?world=${tone}`;
    navigator.clipboard?.writeText(link).then(
      () => { setCopied(true); window.setTimeout(() => setCopied(false), 1800); },
      () => { /* ignore */ },
    );
  }

  return (
    <div className="share-overlay" onClick={onClose}>
      <div className="share-modal" data-tone={tone} onClick={(e) => e.stopPropagation()}>
        <div className="share-preview">
          <div className="sc-scale">
          <div className="sharecard" data-tone={tone} ref={cardRef}>
            <div className="sc-top">
              <span className="sc-brand">DejaView</span>
              <span className="sc-kicker">证据化项目锐评</span>
            </div>
            <div className="sc-subject">// 卷宗 {caseNo(job)} · {subjectName(job)}</div>
            <div className="sc-gauge">
              <div className="sc-pct">{p}<i>%</i></div>
              <div className="sc-glabel">重复造轮子概率</div>
            </div>
            <h1 className="sc-headline">{report?.headline}</h1>
            {report?.verdict_line ? <p className="sc-line">{report.verdict_line}</p> : null}
            <div className="sc-foot">
              <span className="sc-persona">{persona.emoji} {persona.name} · {persona.venue}</span>
              <span className="sc-tag">
                {tone === "roast" ? "🤡 当众处刑" : tone === "comfort" ? "🌈 无条件捧场" : "💰 郑重估值"}
              </span>
            </div>
          </div>
          </div>
        </div>
        <div className="share-actions">
          <button type="button" className="btn" onClick={download} disabled={busy}>
            {busy ? "生成中…" : "⬇ 下载战报图"}
          </button>
          <button type="button" className="link-btn" onClick={copyLink}>
            {copied ? "✓ 链接已复制" : "🔗 复制公开链接"}
          </button>
          <button type="button" className="link-btn" onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  );
}
