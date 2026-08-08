"use client";

import { WORLD_OPTIONS } from "@/lib/showcase-data";
import { useTone } from "@/lib/tone";
import type { Tone } from "@/lib/types";

declare global {
  interface Window {
    __djBurst?: (x?: number, y?: number) => void;
    __djGold?: () => void;
    __djHearts?: (x?: number, y?: number) => void;
  }
}

export default function WorldGate() {
  const { setTone, backToIntro } = useTone();

  function choose(t: Tone, e: React.MouseEvent) {
    // 入场特效：毒舌撒彩带 / 镀金金光 / 彩虹撒爱心
    if (t === "roast") window.__djBurst?.(e.clientX, e.clientY);
    else if (t === "comfort") window.__djHearts?.(e.clientX, e.clientY);
    else window.__djGold?.();
    // 稍等特效起势再换肤，观感更连贯
    window.setTimeout(() => setTone(t), 260);
  }

  return (
    <div className="gate">
      <button type="button" className="splash-back" onClick={backToIntro}>
        ← 返回介绍
      </button>
      <div className="gate-head">
        <span className="gate-kicker">DEJAVIEW · 证据化项目锐评</span>
        <h1 className="gate-title">选择你的审判官</h1>
        <p className="gate-sub">同一份事实，三副面孔。今天，想让谁来锐评你的项目？</p>
      </div>

      <div className="gate-doors">
        {WORLD_OPTIONS.map((world) => (
          <button
            key={world.tone}
            type="button"
            className={`door ${world.className}`}
            onClick={(event) => choose(world.tone, event)}
          >
            {world.tone === "serious" ? <div className="door-shine" aria-hidden="true" /> : null}
            <div className="door-emoji">{world.emoji}</div>
            <div className="door-name">{world.name}</div>
            <div className="door-venue">{world.venue}</div>
            <p className="door-desc">{world.description}</p>
            <span className="door-cta">{world.action}</span>
          </button>
        ))}
      </div>

      <p className="gate-foot">
        进去之后随时能在报告里一键切换 · <b>事实不变，只换脸</b>
      </p>
    </div>
  );
}
