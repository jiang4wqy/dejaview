"use client";

// 客户端外壳：注入世界主题上下文、世界感知的顶栏、全局特效层。
import type { ReactNode } from "react";
import { PERSONA, ToneProvider, useTone } from "@/lib/tone";
import WorldFx from "./WorldFx";

function TopBar() {
  const { tone, setTone, restart } = useTone();
  const other = tone === "roast" ? "serious" : "roast";
  return (
    <header className="app-topbar">
      <div className="app-topbar-inner">
        <a href="/" className="brand">
          <span className="dot" aria-hidden="true" />
          DejaView <small>// 证据化项目锐评</small>
        </a>
        {tone ? (
          <div className="topbar-tools">
            <button className="topbar-restart" onClick={restart} title="回到最开始的介绍页">
              ↻ 从头
            </button>
            <button
              className="persona-pill"
              onClick={() => setTone(other)}
              title={`切到「${PERSONA[other].name}」`}
            >
              <span className="persona-emoji">{PERSONA[tone].emoji}</span>
              <span className="persona-name">{PERSONA[tone].name}</span>
              <span className="persona-swap">切 {PERSONA[other].emoji}</span>
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}

export default function AppChrome({ children }: { children: ReactNode }) {
  return (
    <ToneProvider>
      <WorldFx />
      <TopBar />
      <main className="main">{children}</main>
    </ToneProvider>
  );
}
