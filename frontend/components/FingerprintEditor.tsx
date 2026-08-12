"use client";

import { useState } from "react";
import type { ProjectFingerprint } from "@/lib/types";
import { useLang } from "@/lib/i18n";

interface Props {
  fingerprint: ProjectFingerprint;
  // 由报告页实现：POST /confirm 并恢复轮询。
  onConfirm: (fp: ProjectFingerprint) => Promise<void>;
}

// 把多行文本拆成数组（每行一条，去空行）。
const linesToArr = (s: string) =>
  s
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);

// 等待确认阶段：把 pending_fingerprint 渲染成可编辑卡片。
export default function FingerprintEditor({ fingerprint, onConfirm }: Props) {
  const { t } = useLang();
  const [fp, setFp] = useState<ProjectFingerprint>(fingerprint);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof ProjectFingerprint>(
    key: K,
    value: ProjectFingerprint[K],
  ) {
    setFp((prev) => ({ ...prev, [key]: value }) as ProjectFingerprint);
  }

  function setIo(key: keyof ProjectFingerprint["io"], value: string) {
    setFp((prev) => ({ ...prev, io: { ...prev.io, [key]: value } }));
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm({ ...fp, user_confirmed: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("fpEditor.confirmErr"));
      setSubmitting(false);
    }
  }

  return (
    <div className="panel">
      <span className="invest-kicker">{t("fpEditor.kicker")}</span>
      <h2 className="panel-title" style={{ marginTop: 10 }}>
        {t("fpEditor.title")}
      </h2>
      <p className="muted" style={{ marginTop: 0 }}>
        {t("fpEditor.desc")}
      </p>

      <div className="form" style={{ marginTop: 18 }}>
        <label className="field">
          <span>{t("field.oneLiner")}</span>
          <textarea
            rows={2}
            value={fp.one_liner}
            onChange={(e) => set("one_liner", e.target.value)}
          />
        </label>

        <label className="field">
          <span>{t("field.targetUsers")}</span>
          <textarea
            rows={2}
            value={fp.target_users}
            onChange={(e) => set("target_users", e.target.value)}
          />
        </label>

        <label className="field">
          <span>{t("field.problem")}</span>
          <textarea
            rows={3}
            value={fp.problem}
            onChange={(e) => set("problem", e.target.value)}
          />
        </label>

        <label className="field">
          <span>
            {t("field.functionalSignature")} <span className="hint">{t("field.functionalSignatureHint")}</span>
          </span>
          <textarea
            rows={2}
            value={fp.functional_signature}
            onChange={(e) => set("functional_signature", e.target.value)}
          />
        </label>

        <div className="grid-3">
          <label className="field">
            <span>{t("field.ioInput")}</span>
            <input value={fp.io.input} onChange={(e) => setIo("input", e.target.value)} />
          </label>
          <label className="field">
            <span>{t("field.ioProcessing")}</span>
            <input
              value={fp.io.processing}
              onChange={(e) => setIo("processing", e.target.value)}
            />
          </label>
          <label className="field">
            <span>{t("field.ioOutput")}</span>
            <input value={fp.io.output} onChange={(e) => setIo("output", e.target.value)} />
          </label>
        </div>

        <label className="field">
          <span>{t("field.businessModel")}</span>
          <input
            value={fp.business_model}
            onChange={(e) => set("business_model", e.target.value)}
          />
        </label>

        <label className="field">
          <span>
            {t("field.coreFeatures")} <span className="hint">{t("hint.perLine")}</span>
          </span>
          <textarea
            rows={4}
            value={fp.core_features.join("\n")}
            onChange={(e) => set("core_features", linesToArr(e.target.value))}
          />
        </label>

        <label className="field">
          <span>
            {t("field.claimedNovelty")} <span className="hint">{t("hint.perLine")}</span>
          </span>
          <textarea
            rows={3}
            value={fp.claimed_novelty.join("\n")}
            onChange={(e) => set("claimed_novelty", linesToArr(e.target.value))}
          />
        </label>

        {fp.conflicts?.length || fp.unknowns?.length ? (
          <div className="grid-2">
            {fp.conflicts?.length ? (
              <div>
                <h4 className="mini-title">{t("fpEditor.conflicts")}</h4>
                <ul className="bullet small">
                  {fp.conflicts.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {fp.unknowns?.length ? (
              <div>
                <h4 className="mini-title">{t("fpEditor.unknowns")}</h4>
                <ul className="bullet small">
                  {fp.unknowns.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        {error ? <p className="error">{error}</p> : null}

        <div className="actions">
          <button type="button" className="btn" onClick={submit} disabled={submitting}>
            {submitting ? t("fpEditor.submitting") : t("fpEditor.submit")}
          </button>
        </div>
      </div>
    </div>
  );
}
