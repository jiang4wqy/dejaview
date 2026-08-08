"use client";

// 客户端外壳：注入世界主题上下文、世界感知的顶栏、全局特效层。
import type { ReactNode } from "react";
import Link from "next/link";
import { PERSONA, TONE_CYCLE, ToneProvider, useTone } from "@/lib/tone";
import AccessGate from "./AccessGate";
import WorldFx from "./WorldFx";

function TopBar() {
  const { tone, setTone, restart } = useTone();
  const next = tone ? TONE_CYCLE[(TONE_CYCLE.indexOf(tone) + 1) % TONE_CYCLE.length] : "serious";
  return (
    <header className="app-topbar">
      <div className="app-topbar-inner">
        <Link href="/" className="brand">
          <span className="dot" aria-hidden="true" />
          DejaView <small>// 证据化项目锐评</small>
        </Link>
        <div className="topbar-actions">
          <nav className="topbar-nav" aria-label="开源项目导航">
            <Link href="/report/demo-gitingest">示例</Link>
            <a
              href="https://github.com/jiang4wqy/dejaview/blob/main/docs/DEPLOYMENT.md"
              target="_blank"
              rel="noreferrer noopener"
            >
              部署
            </a>
            <a
              href="https://github.com/jiang4wqy/dejaview"
              target="_blank"
              rel="noreferrer noopener"
            >
              GitHub ↗
            </a>
          </nav>
          {tone ? <div className="topbar-tools">
            <button className="topbar-restart" onClick={restart} title="回到最开始的介绍页">
              ↻ 从头
            </button>
            <button
              className="persona-pill"
              onClick={() => setTone(next)}
              title={`切到「${PERSONA[next].name}」`}
            >
              <span className="persona-emoji">{PERSONA[tone].emoji}</span>
              <span className="persona-name">{PERSONA[tone].name}</span>
              <span className="persona-swap">切 {PERSONA[next].emoji}</span>
            </button>
          </div> : null}
        </div>
      </div>
    </header>
  );
}

export default function AppChrome({ children }: { children: ReactNode }) {
  return (
    <ToneProvider>
      <AccessGate>
        <div className="stage-fx" aria-hidden="true">
          <span className="fx-spot a" />
          <span className="fx-spot b" />
        </div>
        <div className="fx-grain" aria-hidden="true" />
        <WorldFx />
        <TopBar />
        <main className="main">{children}</main>
      </AccessGate>
    </ToneProvider>
  );
}
