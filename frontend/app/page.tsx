"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { analyze } from "@/lib/api";
import { PERSONA, useTone } from "@/lib/tone";
import WorldGate from "@/components/WorldGate";
import Intro from "@/components/Intro";

// 两个世界各自的开场文案（区别明显）。
const HERO = {
  roast: {
    kicker: "🤡 当前审判官 · 马戏团 · 嘲讽现场",
    lead: "把项目交出来，",
    hl: "当众处刑",
    sub: "马戏团今晚开庭：扒你的指纹、翻你的竞品、当场撕碎那点「创新」——每句嘲讽都钉着证据。",
    submit: "拉开帷幕，开嘲 →",
  },
  serious: {
    kicker: "💰 当前审判官 · 华尔街 · 评级委员会",
    lead: "递上你的项目，",
    hl: "接受估值",
    sub: "评级委员会开始尽调：提炼指纹、对标竞品、给出重复度评级与改进优先级——每条结论皆有据可查。",
    submit: "呈上评审，开鉴 →",
  },
  comfort: {
    kicker: "🌈 当前审判官 · 夸夸群 · 无条件捧场",
    lead: "把项目交出来，",
    hl: "被夸到起飞",
    sub: "夸夸群今天全员为你拍彩虹屁：只夸不评、无条件捧场、专治 emo——冲！（纯情绪价值，不代表真实评价）",
    submit: "求夸，走一个 →",
  },
} as const;

// 预生成的示例报告（public/demos/*.json），点一下秒开，无需等待跑分析。
const DEMOS = [
  { slug: "gitingest", label: "Gitingest", dup: "0.65" },
  { slug: "excalidraw", label: "Excalidraw", dup: "0.60" },
  { slug: "kutt", label: "Kutt", dup: "0.15" },
];

const EXAMPLES = [
  { label: "Gitingest", website: "https://gitingest.com", github: "https://github.com/cyclotruc/gitingest",
    users: "用 LLM 处理代码库的开发者", problem: "把 GitHub 仓库转成适合喂给 LLM 的文本", novelty: "改 URL 的 hub→ingest 一键转换" },
  { label: "Excalidraw", website: "https://excalidraw.com", github: "https://github.com/excalidraw/excalidraw",
    users: "需要快速画图的团队", problem: "手绘风白板 / 图表", novelty: "手绘质感 + 端到端加密协作" },
  { label: "Umami", website: "https://umami.is", github: "https://github.com/umami-software/umami",
    users: "在意隐私的网站主", problem: "隐私友好的网站分析", novelty: "无 cookie / 可自托管" },
];

export default function HomePage() {
  const router = useRouter();
  const { tone, ready, seenIntro, reset } = useTone();

  const [clue, setClue] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [targetUsers, setTargetUsers] = useState("");
  const [problemSolved, setProblemSolved] = useState("");
  const [claimedNovelty, setClaimedNovelty] = useState("");
  const [confirmFingerprint, setConfirmFingerprint] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function fillExample(ex: (typeof EXAMPLES)[number]) {
    setClue(ex.website);
    setGithubUrl(ex.github);
    setTargetUsers(ex.users);
    setProblemSolved(ex.problem);
    setClaimedNovelty(ex.novelty);
    setShowMore(true);
    setError(null);
  }

  // 主线索：像 URL 就当网址/GitHub，否则当作一句话描述
  function parseClue(raw: string): { website_url?: string; github_url?: string; description?: string } {
    const s = raw.trim();
    if (!s) return {};
    const looksUrl = /^https?:\/\//i.test(s) || /^[\w-]+(\.[\w-]+)+(\/|$)/.test(s);
    if (!looksUrl) return { description: s };
    const url = /^https?:\/\//i.test(s) ? s : `https://${s}`;
    return /github\.com/i.test(url) ? { github_url: url } : { website_url: url };
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = parseClue(clue);
    const web = parsed.website_url;
    const gh = githubUrl.trim() || parsed.github_url;
    const desc = parsed.description || "";
    if (!web && !gh && !desc) {
      setError("给一条线索就行：贴个网址、GitHub，或直接一句话描述你的项目。");
      return;
    }
    // 提交特效：毒舌撒彩带 / 镀金金光 / 彩虹撒爱心
    if (tone === "roast") window.__djBurst?.(window.innerWidth / 2, window.innerHeight * 0.7);
    else if (tone === "comfort") window.__djHearts?.(window.innerWidth / 2, window.innerHeight * 0.7);
    else window.__djGold?.();

    setSubmitting(true);
    try {
      const { job_id } = await analyze({
        website_url: web,
        github_url: gh,
        description: desc || undefined,
        author_statement: {
          target_users: targetUsers.trim(),
          problem_solved: problemSolved.trim(),
          claimed_novelty: claimedNovelty.trim(),
        },
        tone: tone ?? "serious",
        confirm_fingerprint: confirmFingerprint,
        language: "zh",
      });
      router.push(`/report/${job_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "提交失败，请稍后重试。");
      setSubmitting(false);
    }
  }

  // 首帧未恢复状态时留白，避免闪烁
  if (!ready) return null;
  // 最开始：项目介绍页 → 选审判官 → 表单
  if (!seenIntro) return <Intro />;
  if (!tone) return <WorldGate />;

  const p = PERSONA[tone];
  const hero = HERO[tone];
  const submitLabel = hero.submit;

  return (
    <div className="home">
      <button type="button" className="home-back" onClick={reset}>
        ← 换个审判官
      </button>
      <section className="home-hero">
        <span className="home-kicker rise">{hero.kicker}</span>
        <h1 className="home-title rise" style={{ animationDelay: ".05s" }}>
          {hero.lead}<span className="hl">{hero.hl}</span>
        </h1>
        <p className="home-sub rise" style={{ animationDelay: ".1s" }}>
          {hero.sub}
        </p>
        <div className="home-examples">
          <span className="mono faint">没项目练手？点一下填入示例：</span>
          {EXAMPLES.map((ex) => (
            <button key={ex.label} type="button" className="chip-ex" onClick={() => fillExample(ex)}>
              {ex.label}
            </button>
          ))}
        </div>
        <div className="home-demos">
          <span className="mono faint">或直接看已跑好的示例报告（秒开，无需等待）：</span>
          {DEMOS.map((d) => (
            <button
              key={d.slug}
              type="button"
              className="chip-demo"
              onClick={() => router.push(`/report/demo-${d.slug}`)}
            >
              {d.label} <b>重复度 {d.dup}</b>
            </button>
          ))}
        </div>
        <div className="home-flow">
          <span>提取指纹</span>
          <span>搜同类</span>
          <span>判重复度</span>
          <span>出锐评</span>
        </div>
      </section>

      <form className="panel form" onSubmit={onSubmit}>
        <label className="field">
          <span>
            贴上你的项目 <span className="req">*</span>
          </span>
          <textarea
            className="clue-input"
            rows={2}
            placeholder="网址 / GitHub 链接 / 或直接一句话描述（例：一个帮宠物主记疫苗时间的小程序）"
            value={clue}
            onChange={(e) => setClue(e.target.value)}
          />
          <span className="hint">一条线索就够 —— 有网址最准，纯想法也能测。</span>
        </label>

        <button type="button" className="more-toggle" onClick={() => setShowMore((v) => !v)}>
          {showMore ? "－ 收起补充线索" : "＋ 补充更多线索（可选，结论更准）"}
        </button>

        {showMore ? (
          <div className="more-fields">
            <label className="field">
              <span>GitHub 仓库（可选）</span>
              <input type="url" inputMode="url" placeholder="https://github.com/owner/repo"
                value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} />
            </label>
            <label className="field">
              <span>目标用户是谁？</span>
              <textarea rows={2} placeholder="例如：需要快速整理会议纪要的产品经理"
                value={targetUsers} onChange={(e) => setTargetUsers(e.target.value)} />
            </label>
            <label className="field">
              <span>解决了什么问题？</span>
              <textarea rows={2} placeholder="例如：把散乱的语音记录一键转成结构化纪要"
                value={problemSolved} onChange={(e) => setProblemSolved(e.target.value)} />
            </label>
            <label className="field">
              <span>你认为的创新点？</span>
              <textarea rows={2} placeholder="例如：本地推理 + 说话人分离，隐私不出端"
                value={claimedNovelty} onChange={(e) => setClaimedNovelty(e.target.value)} />
            </label>
            <label className="checkbox">
              <input type="checkbox" checked={confirmFingerprint}
                onChange={(e) => setConfirmFingerprint(e.target.checked)} />
              <span>提交前让我确认项目指纹（省 token，也更准）</span>
            </label>
          </div>
        ) : null}

        {error ? <p className="error">{error}</p> : null}

        <div className="actions">
          <button type="submit" className="btn" disabled={submitting}>
            {submitting ? "过堂中…" : submitLabel}
          </button>
          <span className="mono faint small">
            审判官：{p.emoji} {p.name} · 顶栏可一键换脸
          </span>
        </div>
      </form>
    </div>
  );
}
