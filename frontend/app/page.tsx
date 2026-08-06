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
      setError("至少给一条线索：网站链接或 GitHub 仓库，二选一。");
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
      <section className="home-hero">
        <span className="home-kicker">// 证据化项目锐评</span>
        <h1 className="home-title">
          把你的项目丢进来，<span className="hl">被 AI 看穿</span>
        </h1>
        <p className="home-sub">
          提炼项目指纹、检索相似项目、给出重复度裁判与改进优先级——每条结论都能点开物证。
          认真或毒舌，同一份事实，两种语气。
        </p>
      </section>

      <form className="panel form" onSubmit={onSubmit}>
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
        <p className="faint small mono">* 网站与 GitHub 至少填一个，两个都给结论更准。</p>

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
          <span>先定个语气</span>
          <div className="toggle" data-sel={tone} role="radiogroup" aria-label="选择语气">
            <span className="knob" aria-hidden="true" />
            <button
              type="button"
              role="radio"
              aria-checked={tone === "serious"}
              onClick={() => setTone("serious")}
            >
              认真
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={tone === "roast"}
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
          <span>提交前让我确认项目指纹（省 token，也更准）</span>
        </label>

        {error ? <p className="error">{error}</p> : null}

        <div className="actions">
          <button type="submit" className="btn" disabled={submitting}>
            {submitting ? "提交中…" : "开始锐评 →"}
          </button>
        </div>
      </form>
    </div>
  );
}
