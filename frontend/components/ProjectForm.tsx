"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { analyze } from "@/lib/api";
import { EXAMPLE_PROJECTS } from "@/lib/showcase-data";
import { PERSONA } from "@/lib/tone";
import type { Tone } from "@/lib/types";

function parseClue(raw: string): {
  website_url?: string;
  github_url?: string;
  description?: string;
} {
  const value = raw.trim();
  if (!value) return {};
  const looksLikeUrl = /^https?:\/\//i.test(value) || /^[\w-]+(\.[\w-]+)+(\/|$)/.test(value);
  if (!looksLikeUrl) return { description: value };
  const url = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  return /github\.com/i.test(url) ? { github_url: url } : { website_url: url };
}

export default function ProjectForm({ tone, submitLabel }: { tone: Tone; submitLabel: string }) {
  const router = useRouter();
  const [clue, setClue] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [targetUsers, setTargetUsers] = useState("");
  const [problemSolved, setProblemSolved] = useState("");
  const [claimedNovelty, setClaimedNovelty] = useState("");
  const [confirmFingerprint, setConfirmFingerprint] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function fillExample(example: (typeof EXAMPLE_PROJECTS)[number]) {
    setClue(example.website);
    setGithubUrl(example.github);
    setTargetUsers(example.users);
    setProblemSolved(example.problem);
    setClaimedNovelty(example.novelty);
    setShowMore(true);
    setError(null);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const parsed = parseClue(clue);
    const websiteUrl = parsed.website_url;
    const repositoryUrl = githubUrl.trim() || parsed.github_url;
    const description = parsed.description || "";
    if (!websiteUrl && !repositoryUrl && !description) {
      setError("给一条线索就行：贴网址、GitHub，或用一句话描述你的项目。");
      return;
    }

    if (tone === "roast") window.__djBurst?.(window.innerWidth / 2, window.innerHeight * 0.7);
    else if (tone === "comfort") window.__djHearts?.(window.innerWidth / 2, window.innerHeight * 0.7);
    else window.__djGold?.();

    setSubmitting(true);
    try {
      const { job_id } = await analyze({
        website_url: websiteUrl,
        github_url: repositoryUrl,
        description: description || undefined,
        author_statement: {
          target_users: targetUsers.trim(),
          problem_solved: problemSolved.trim(),
          claimed_novelty: claimedNovelty.trim(),
        },
        tone,
        confirm_fingerprint: confirmFingerprint,
        language: "zh",
      });
      router.push(`/report/${job_id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "提交失败，请稍后重试。");
      setSubmitting(false);
    }
  }

  return (
    <form className="panel form" onSubmit={onSubmit} aria-busy={submitting}>
      <div className="home-examples">
        <span className="mono faint">没项目练手？填入公开示例：</span>
        {EXAMPLE_PROJECTS.map((example) => (
          <button
            key={example.label}
            type="button"
            className="chip-ex"
            onClick={() => fillExample(example)}
          >
            {example.label}
          </button>
        ))}
      </div>

      <label className="field">
        <span>
          贴上你的项目 <span className="req">*</span>
        </span>
        <textarea
          className="clue-input"
          rows={2}
          placeholder="网址 / GitHub / 一句话描述（例：帮宠物主记录疫苗时间的小程序）"
          value={clue}
          onChange={(event) => setClue(event.target.value)}
          aria-describedby="project-clue-hint"
        />
        <span className="hint" id="project-clue-hint">
          一条线索就够——有公开网址最准，纯想法也能测。
        </span>
      </label>

      <button
        type="button"
        className="more-toggle"
        aria-expanded={showMore}
        aria-controls="project-extra-fields"
        onClick={() => setShowMore((visible) => !visible)}
      >
        {showMore ? "－ 收起补充线索" : "＋ 补充更多线索（可选，结论更准）"}
      </button>

      {showMore ? (
        <div className="more-fields" id="project-extra-fields">
          <label className="field">
            <span>GitHub 仓库（可选）</span>
            <input
              type="url"
              inputMode="url"
              autoComplete="url"
              placeholder="https://github.com/owner/repo"
              value={githubUrl}
              onChange={(event) => setGithubUrl(event.target.value)}
            />
          </label>
          <label className="field">
            <span>目标用户是谁？</span>
            <textarea
              rows={2}
              placeholder="例如：需要快速整理会议纪要的产品经理"
              value={targetUsers}
              onChange={(event) => setTargetUsers(event.target.value)}
            />
          </label>
          <label className="field">
            <span>解决了什么问题？</span>
            <textarea
              rows={2}
              placeholder="例如：把散乱语音一键转成结构化纪要"
              value={problemSolved}
              onChange={(event) => setProblemSolved(event.target.value)}
            />
          </label>
          <label className="field">
            <span>你认为的创新点？</span>
            <textarea
              rows={2}
              placeholder="例如：本地推理 + 说话人分离，隐私不出端"
              value={claimedNovelty}
              onChange={(event) => setClaimedNovelty(event.target.value)}
            />
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={confirmFingerprint}
              onChange={(event) => setConfirmFingerprint(event.target.checked)}
            />
            <span>搜索前让我确认项目指纹（省 Token，也更准）</span>
          </label>
        </div>
      ) : null}

      <aside className="privacy-note">
        <b>提交前请确认：</b>mock 模式不消耗 Key；真实模式会消耗部署者额度。请勿提交私有仓库、内网地址或敏感业务资料。
      </aside>

      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="actions">
        <button type="submit" className="btn" disabled={submitting}>
          {submitting ? "过堂中…" : submitLabel}
        </button>
        <span className="mono faint small">
          审判官：{PERSONA[tone].emoji} {PERSONA[tone].name} · 顶栏可随时换脸
        </span>
      </div>
    </form>
  );
}
