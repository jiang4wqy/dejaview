"use client";

import { getWorldOptions } from "@/lib/showcase-data";
import { useTone } from "@/lib/tone";
import { useLang } from "@/lib/i18n";
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
  const { t } = useLang();
  const worldOptions = getWorldOptions(t);

  function choose(tone: Tone, e: React.MouseEvent) {
    // 入场特效：毒舌撒彩带 / 镀金金光 / 彩虹撒爱心
    if (tone === "roast") window.__djBurst?.(e.clientX, e.clientY);
    else if (tone === "comfort") window.__djHearts?.(e.clientX, e.clientY);
    else window.__djGold?.();
    // 稍等特效起势再换肤，观感更连贯
    window.setTimeout(() => setTone(tone), 260);
  }

  return (
    <div className="gate">
      <button type="button" className="splash-back" onClick={backToIntro}>
        {t("gate.back")}
      </button>
      <div className="gate-head">
        <span className="gate-kicker">DEJAVIEW · {t("brand.tagline")}</span>
        <h1 className="gate-title">{t("gate.title")}</h1>
        <p className="gate-sub">{t("gate.sub")}</p>
      </div>

      <div className="gate-doors">
        {worldOptions.map((world) => (
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
        {t("gate.footPrefix")} <b>{t("gate.footBold")}</b>
      </p>
    </div>
  );
}
