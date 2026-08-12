"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { analyze } from "@/lib/api";
import { EXAMPLE_PROJECTS } from "@/lib/showcase-data";
import { PERSONA } from "@/lib/tone";
import { useLang } from "@/lib/i18n";
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
  const { t } = useLang();
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
      setError(t("form.errNoClue"));
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
      });
      router.push(`/report/${job_id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("form.errSubmitFail"));
      setSubmitting(false);
    }
  }

  return (
    <form className="panel form" onSubmit={onSubmit} aria-busy={submitting}>
      <div className="home-examples">
        <span className="mono faint">{t("form.examplesLabel")}</span>
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
          {t("form.clueLabel")} <span className="req">*</span>
        </span>
        <textarea
          className="clue-input"
          rows={2}
          placeholder={t("form.cluePlaceholder")}
          value={clue}
          onChange={(event) => setClue(event.target.value)}
          aria-describedby="project-clue-hint"
        />
        <span className="hint" id="project-clue-hint">
          {t("form.clueHint")}
        </span>
      </label>

      <button
        type="button"
        className="more-toggle"
        aria-expanded={showMore}
        aria-controls="project-extra-fields"
        onClick={() => setShowMore((visible) => !visible)}
      >
        {showMore ? t("form.moreHide") : t("form.moreShow")}
      </button>

      {showMore ? (
        <div className="more-fields" id="project-extra-fields">
          <label className="field">
            <span>{t("form.githubLabel")}</span>
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
            <span>{t("form.targetUsersLabel")}</span>
            <textarea
              rows={2}
              placeholder={t("form.targetUsersPlaceholder")}
              value={targetUsers}
              onChange={(event) => setTargetUsers(event.target.value)}
            />
          </label>
          <label className="field">
            <span>{t("form.problemLabel")}</span>
            <textarea
              rows={2}
              placeholder={t("form.problemPlaceholder")}
              value={problemSolved}
              onChange={(event) => setProblemSolved(event.target.value)}
            />
          </label>
          <label className="field">
            <span>{t("form.noveltyLabel")}</span>
            <textarea
              rows={2}
              placeholder={t("form.noveltyPlaceholder")}
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
            <span>{t("form.confirmFpLabel")}</span>
          </label>
        </div>
      ) : null}

      <aside className="privacy-note">
        <b>{t("form.privacyBold")}</b>{t("form.privacyRest")}
      </aside>

      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="actions">
        <button type="submit" className="btn" disabled={submitting}>
          {submitting ? t("form.submitting") : submitLabel}
        </button>
        <span className="mono faint small">
          {t("form.judgeLabel")}{PERSONA[tone].emoji} {PERSONA[tone].name} {t("form.judgeSwitchHint")}
        </span>
      </div>
    </form>
  );
}
