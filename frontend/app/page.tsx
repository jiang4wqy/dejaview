"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { analyze } from "@/lib/api";
import type { Tone } from "@/lib/types";

export default function HomePage() {
  const router = useRouter();

  const [websiteUrl, setWebsiteUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [targetUsers, setTargetUsers] = useState("");
  const [problemSolved, setProblemSolved] = useState("");
  const [claimedNovelty, setClaimedNovelty] = useState("");
  const [tone, setTone] = useState<Tone>("serious");
  const [confirmFingerprint, setConfirmFingerprint] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    // 校验：网站链接与 GitHub 仓库至少填一个。
    if (!websiteUrl.trim() && !githubUrl.trim()) {
      setError("请至少填写「网站链接」或「GitHub 仓库」其中之一。");
      return;
    }

    setSubmitting(true);
    try {
      const { job_id } = await analyze({
        website_url: websiteUrl.trim() || undefined,
        github_url: githubUrl.trim() || undefined,
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "提交失败，请稍后重试。");
      setSubmitting(false);
    }
  }

  return (
    <div className="home">
      <section className="hero">
        <h1 className="hero-title">让 DejaView 锐评你的项目</h1>
        <p className="hero-sub">
          提交一个网站（可选 GitHub 仓库），回答三个问题，选择语气。
          我们会提炼项目指纹、搜索相似项目、给出重复度裁判与改进建议。
        </p>
      </section>

      <form className="card form" onSubmit={onSubmit}>
        <label className="field">
          <span>
            网站链接 <span className="req">*</span>
          </span>
          <input
            type="url"
            inputMode="url"
            placeholder="https://your-project.com"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
          />
        </label>

        <label className="field">
          <span>
            GitHub 仓库 <span className="req">*</span>
          </span>
          <input
            type="url"
            inputMode="url"
            placeholder="https://github.com/owner/repo"
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
          />
        </label>
        <p className="muted small">* 网站链接与 GitHub 仓库至少填写其中之一。</p>

        <div className="divider" />

        <label className="field">
          <span>你的目标用户是谁？</span>
          <textarea
            rows={2}
            placeholder="例如：需要快速整理会议纪要的产品经理"
            value={targetUsers}
            onChange={(e) => setTargetUsers(e.target.value)}
          />
        </label>

        <label className="field">
          <span>你解决了什么问题？</span>
          <textarea
            rows={2}
            placeholder="例如：把散乱的语音记录一键转成结构化纪要"
            value={problemSolved}
            onChange={(e) => setProblemSolved(e.target.value)}
          />
        </label>

        <label className="field">
          <span>你认为的创新点是什么？</span>
          <textarea
            rows={2}
            placeholder="例如：本地推理 + 说话人分离，隐私不出端"
            value={claimedNovelty}
            onChange={(e) => setClaimedNovelty(e.target.value)}
          />
        </label>

        <div className="divider" />

        <div className="field">
          <span>语气</span>
          <div className="toggle" role="radiogroup" aria-label="选择语气">
            <button
              type="button"
              role="radio"
              aria-checked={tone === "serious"}
              className={tone === "serious" ? "active" : ""}
              onClick={() => setTone("serious")}
            >
              认真
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={tone === "roast"}
              className={tone === "roast" ? "active" : ""}
              onClick={() => setTone("roast")}
            >
              毒舌
            </button>
          </div>
        </div>

        <label className="checkbox">
          <input
            type="checkbox"
            checked={confirmFingerprint}
            onChange={(e) => setConfirmFingerprint(e.target.checked)}
          />
          <span>提交前让我确认项目指纹</span>
        </label>

        {error ? <p className="error">{error}</p> : null}

        <div className="actions">
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? "提交中…" : "开始锐评"}
          </button>
        </div>
      </form>
    </div>
  );
}
