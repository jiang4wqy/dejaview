"use client";

// 分享战报：把报告核心做成一张海报卡，用 html-to-image 抓成 PNG 下载；并可复制公开链接。
// 客户端抓图 = 用浏览器自带中文字体渲染，规避服务端 OG(satori) 缺 CJK 字体的问题。
import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import type { Job, Tone } from "@/lib/types";
import { personaOf } from "@/lib/tone";
import { useLang } from "@/lib/i18n";
import { caseNo, subjectName, toPercent, verdictStamp } from "@/lib/report-format";

export default function ShareModal({ job, tone, onClose }: { job: Job; tone: Tone; onClose: () => void }) {
  const { t } = useLang();
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const report = job.reports?.[tone];
  const p = toPercent(job.result?.duplication?.duplication_score);
  const persona = personaOf(t, tone);
  const subject = subjectName(job, t("report.subjectFallback"));
  // 裁决词(与百分比、语气绑定, 与报告页共用同一套阈值)、一句 zinger、语气标签 —— 海报重点。
  const verdictWord = verdictStamp(p, tone, t);
  const zinger = report?.verdict_line || report?.headline || "";
  const tag = tone === "roast" ? t("share.tagRoast")
    : tone === "comfort" ? t("share.tagComfort") : t("share.tagSerious");
  // 让海报"看得懂项目 + 看得到评审要点": 一句话定性 + 关键结论(问题在前/优点在后) + 最该改的一件事。
  // 全部取自统一事实层 / 本语气报告, 不新增未经证实的说法(见 pipeline/report.py 不变量)。
  const oneLiner = job.result?.fingerprint?.one_liner || "";
  const points = [
    ...(job.result?.issues ?? []).map((f) => ({ kind: "warn" as const, title: f.title })),
    ...(job.result?.strengths ?? []).map((f) => ({ kind: "up" as const, title: f.title })),
  ]
    .filter((p) => p.title)
    .slice(0, 3);
  const topFix = report?.top_fix || "";

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
      a.download = `DejaView-${subject.replace(/[^\w-]/g, "_")}-${tone}.png`;
      a.click();
    } catch (e) {
      console.error("Failed to generate share card", e);
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
              <span className="sc-kicker">{t("brand.tagline")}</span>
            </div>
            <div className="sc-body">
              <div className="sc-ontrial">{t("share.onTrial")} · {caseNo(job)}</div>
              <div className="sc-subject">{subject}</div>
              {oneLiner ? (
                <p className="sc-about"><i>{t("share.about")}</i>{oneLiner}</p>
              ) : null}
              <div className="sc-verdict">
                <div className="sc-pct">{p}<i>%</i></div>
                <div className="sc-vmeta">
                  <span className="sc-word">{verdictWord}</span>
                  <span className="sc-glabel">{t("metric.dupProb")}</span>
                </div>
              </div>
              {/* zinger 与 points/topFix 表达重叠; 有要点时省去它, 既去冗余又避免整体溢出裁切 */}
              {zinger && !points.length ? <p className="sc-line">{zinger}</p> : null}
              {points.length ? (
                <ul className="sc-points">
                  {points.map((pt, i) => (
                    <li key={i} className={pt.kind}>
                      <span className="sc-pt-ic" aria-hidden="true">{pt.kind === "up" ? "✓" : "⚠"}</span>
                      <span className="sc-pt-tx">{pt.title}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {topFix ? (
                <p className="sc-fix"><i>{t("share.fixLabel")}</i>{topFix}</p>
              ) : null}
            </div>
            <div className="sc-foot">
              <span className="sc-persona">{persona.emoji} {persona.name} · {persona.venue}</span>
              <span className="sc-tag">{tag}</span>
            </div>
          </div>
          </div>
        </div>
        <div className="share-actions">
          <button type="button" className="btn" onClick={download} disabled={busy}>
            {busy ? t("share.generating") : t("share.download")}
          </button>
          <button type="button" className="link-btn" onClick={copyLink}>
            {copied ? t("share.linkCopied") : t("share.copyLink")}
          </button>
          <button type="button" className="link-btn" onClick={onClose}>{t("share.close")}</button>
        </div>
      </div>
    </div>
  );
}
