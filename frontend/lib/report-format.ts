// 报告页与分享战报海报共享的纯展示 helper。
// 目的: 让「战报海报」(ShareCard) 与「报告页」(ReportView) 用同一套阈值、同一套
// 项目名 / 卷宗号 / 百分比 / 裁决词 / 事实层排序 —— 避免两处各自实现导致静默漂移
// (例如调了重复度阈值, 海报和报告却不一致)。
import type { AnalysisResult, Finding, Job, Tone } from "./types";
import type { TFunc } from "./i18n";

// 重复度分数容错: 可能是 0..1 小数或 0..100 整数; 缺失按 0 处理。
export function toPercent(score?: number): number {
  if (score == null) return 0;
  const n = score <= 1 ? score * 100 : score;
  return Math.max(0, Math.min(100, Math.round(n)));
}

// 从请求派生「被告项目」显示名: GitHub owner/repo 优先, 其次网站域名, 都没有则回退。
export function subjectName(job: Job, fallback: string): string {
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
  return gh || fallback;
}

// 卷宗号: DV- + 任务 id 前 6 位字母数字(大写)。纯装饰。
export function caseNo(job: Job): string {
  const slug = (job.id || "").replace(/[^a-z0-9]/gi, "").slice(0, 6).toUpperCase();
  return `DV-${slug || "000000"}`;
}

// 裁决词: 随重复度分档 (>=60 / >=40 / 其余) + 语气变化。同一事实, 换脸不换事实。
// 阈值与 i18n key 在此唯一定义, 海报与报告都调用它。
export function verdictStamp(pct: number, tone: Tone, t: TFunc): string {
  const roast = tone === "roast";
  if (pct >= 60) return roast ? t("verdictStamp.repeatRoast") : t("verdictStamp.repeat");
  if (pct >= 40) return roast ? t("verdictStamp.warnRoast") : t("verdictStamp.warn");
  return roast ? t("verdictStamp.okRoast") : t("verdictStamp.ok");
}

// 统一事实层的展示顺序: 问题在前、优点在后。海报与报告读同一个顺序, 保证一致。
export function orderedFindings(result?: AnalysisResult | null): Finding[] {
  return [...(result?.issues ?? []), ...(result?.strengths ?? [])];
}
