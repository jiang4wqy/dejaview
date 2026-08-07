"use client";

// 开场：选择你的审判官。两扇对开门——左"镀金·华尔街"，右"毒舌·马戏团"。
// 点击开门 → 触发对应世界的入场特效 → 设定 tone，整站换肤。
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
        <p className="gate-sub">同一份事实，两副面孔。今天，想让谁来锐评你的项目？</p>
      </div>

      <div className="gate-doors">
        <button className="door door-gilt" onClick={(e) => choose("serious", e)}>
          <div className="door-shine" aria-hidden="true" />
          <div className="door-emoji">💰</div>
          <div className="door-name">镀金</div>
          <div className="door-venue">华尔街 · 评级委员会</div>
          <p className="door-desc">西装、黄金与股票机。体面地告诉你，这轮子值几个钱。</p>
          <span className="door-cta">推门而入 →</span>
        </button>

        <button className="door door-clown" onClick={(e) => choose("roast", e)}>
          <div className="door-emoji">🤡</div>
          <div className="door-name">毒舌</div>
          <div className="door-venue">马戏团 · 嘲讽现场</div>
          <p className="door-desc">彩带、汽笛与暴击。当着全场，把你的轮子拆穿。</p>
          <span className="door-cta">掀开帐篷 →</span>
        </button>

        <button className="door door-comfort" onClick={(e) => choose("comfort", e)}>
          <div className="door-emoji">🌈</div>
          <div className="door-name">彩虹</div>
          <div className="door-venue">夸夸群 · 无条件捧场</div>
          <p className="door-desc">只夸不评、彩虹屁拉满。专治 emo，给你无条件的爱。</p>
          <span className="door-cta">抱抱我 →</span>
        </button>
      </div>

      <p className="gate-foot">
        进去之后随时能在报告里一键切换 · <b>事实不变，只换脸</b>
      </p>
    </div>
  );
}
