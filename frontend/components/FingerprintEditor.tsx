"use client";

import { useState } from "react";
import type { ProjectFingerprint } from "@/lib/types";

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
      setError(err instanceof Error ? err.message : "确认失败，请重试。");
      setSubmitting(false);
    }
  }

  return (
    <div className="panel">
      <span className="invest-kicker">// 成本闸门 · 请先过目</span>
      <h2 className="panel-title" style={{ marginTop: 10 }}>
        确认项目指纹
      </h2>
      <p className="muted" style={{ marginTop: 0 }}>
        下面这份"项目指纹"是我们从你的网站 / 仓库里提炼的。核对并按需修改——确认后才会去跑
        昂贵的相似项目搜索与重复度裁判。
      </p>

      <div className="form" style={{ marginTop: 18 }}>
        <label className="field">
          <span>一句话简介</span>
          <textarea
            rows={2}
            value={fp.one_liner}
            onChange={(e) => set("one_liner", e.target.value)}
          />
        </label>

        <label className="field">
          <span>目标用户</span>
          <textarea
            rows={2}
            value={fp.target_users}
            onChange={(e) => set("target_users", e.target.value)}
          />
        </label>

        <label className="field">
          <span>解决的问题</span>
          <textarea
            rows={3}
            value={fp.problem}
            onChange={(e) => set("problem", e.target.value)}
          />
        </label>

        <label className="field">
          <span>
            功能签名 <span className="hint">functional signature · 驱动相似项目搜索</span>
          </span>
          <textarea
            rows={2}
            value={fp.functional_signature}
            onChange={(e) => set("functional_signature", e.target.value)}
          />
        </label>

        <div className="grid-3">
          <label className="field">
            <span>输入</span>
            <input value={fp.io.input} onChange={(e) => setIo("input", e.target.value)} />
          </label>
          <label className="field">
            <span>处理</span>
            <input
              value={fp.io.processing}
              onChange={(e) => setIo("processing", e.target.value)}
            />
          </label>
          <label className="field">
            <span>输出</span>
            <input value={fp.io.output} onChange={(e) => setIo("output", e.target.value)} />
          </label>
        </div>

        <label className="field">
          <span>商业模式</span>
          <input
            value={fp.business_model}
            onChange={(e) => set("business_model", e.target.value)}
          />
        </label>

        <label className="field">
          <span>
            核心功能 <span className="hint">每行一条</span>
          </span>
          <textarea
            rows={4}
            value={fp.core_features.join("\n")}
            onChange={(e) => set("core_features", linesToArr(e.target.value))}
          />
        </label>

        <label className="field">
          <span>
            宣称的创新点 <span className="hint">每行一条</span>
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
                <h4 className="mini-title">// 冲突点</h4>
                <ul className="bullet small">
                  {fp.conflicts.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {fp.unknowns?.length ? (
              <div>
                <h4 className="mini-title">// 未知项</h4>
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
            {submitting ? "提交中…" : "确认并继续调查"}
          </button>
        </div>
      </div>
    </div>
  );
}
