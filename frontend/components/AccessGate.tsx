"use client";

// 进站访问码门。仅当后端设了访问码(health.access_required)时才拦；口令对了才放进站。
// 真正的强制在后端 /api/analyze —— 这里只是体验层，让朋友进站输一次、之后自动带上。
import { useEffect, useState, type ReactNode } from "react";
import { checkAccess, clearAccessCode, getAccessCode, health, setAccessCode } from "@/lib/api";

type Phase = "checking" | "locked" | "open";

export default function AccessGate({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>("checking");
  const [code, setCode] = useState("");
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      let required = false;
      try {
        required = !!(await health()).access_required;
      } catch {
        setPhase("open"); // 拿不到后端就不误锁，交给后端自己拦
        return;
      }
      if (!required) {
        setPhase("open");
        return;
      }
      const saved = getAccessCode();
      if (saved && (await checkAccess(saved))) {
        setPhase("open");
        return;
      }
      clearAccessCode();
      setPhase("locked");
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const c = code.trim();
    if (!c) return;
    setBusy(true);
    setErr(false);
    const ok = await checkAccess(c);
    setBusy(false);
    if (ok) {
      setAccessCode(c);
      setPhase("open");
    } else {
      setErr(true);
      setCode("");
    }
  }

  if (phase === "checking") {
    return (
      <div className="access-gate" role="status">
        <div className="access-card access-checking">
          <div className="access-emoji" aria-hidden="true">⌛</div>
          <h1>DejaView</h1>
          <p className="access-sub">正在确认公开演示的访问状态…</p>
        </div>
      </div>
    );
  }
  if (phase === "open") return <>{children}</>;

  return (
    <div className="access-gate">
      <form className={`access-card${err ? " shake" : ""}`} onSubmit={submit}>
        <div className="access-emoji" aria-hidden="true">🔒</div>
        <h1>DejaView</h1>
        <p className="access-sub">部署者已开启访问保护 · 请输入访问口令</p>
        <label className="sr-only" htmlFor="dejaview-access-code">访问口令</label>
        <input
          id="dejaview-access-code"
          className="access-input"
          type="password"
          autoComplete="current-password"
          autoFocus
          placeholder="访问口令"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setErr(false);
          }}
        />
        {err ? <p className="access-err" role="alert">口令不对，请检查后再试。</p> : null}
        <button className="access-btn" type="submit" disabled={busy || !code.trim()}>
          {busy ? "验证中…" : "进站 →"}
        </button>
      </form>
    </div>
  );
}
