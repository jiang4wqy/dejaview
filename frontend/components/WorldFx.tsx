"use client";

// 全局特效层（挂在 layout）：
//  - 毒舌世界：canvas 彩带引擎（入场/点击炸彩带 + 常驻飘落），暴露 window.__djBurst。
//  - 镀金世界：金光扫屏（window.__djGold）+ 顶部股票滚动条（纯 CSS 跑马灯）。
// 全部尊重 prefers-reduced-motion。
import { useEffect, useRef, useState } from "react";
import { useTone } from "@/lib/tone";

const CLOWN_COLORS = ["#ff2e88", "#00f5a0", "#ffe600", "#00e5ff", "#b14aff", "#ff7a00"];

type P = { x: number; y: number; vx: number; vy: number; g: number; r: number; c: string; rot: number; vr: number; life: number };

export default function WorldFx() {
  const { tone } = useTone();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gold, setGold] = useState(false);

  useEffect(() => {
    const cv = canvasRef.current;
    const cx = cv?.getContext("2d");
    if (!cv || !cx) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let parts: P[] = [];
    let dz = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      cv!.width = window.innerWidth * dpr;
      cv!.height = window.innerHeight * dpr;
      cv!.style.width = window.innerWidth + "px";
      cv!.style.height = window.innerHeight + "px";
      cx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    function spawn(x: number, y: number, n: number) {
      for (let i = 0; i < n; i++)
        parts.push({
          x, y,
          vx: (Math.random() - 0.5) * 11,
          vy: Math.random() * -11 - 2,
          g: 0.3,
          r: Math.random() * 7 + 4,
          c: CLOWN_COLORS[(Math.random() * CLOWN_COLORS.length) | 0],
          rot: Math.random() * 6,
          vr: (Math.random() - 0.5) * 0.5,
          life: 1,
        });
    }
    window.__djBurst = (x?: number, y?: number) =>
      spawn(x ?? window.innerWidth / 2, y ?? window.innerHeight / 3, reduce ? 0 : 90);
    window.__djGold = () => {
      setGold(true);
      window.setTimeout(() => setGold(false), 1100);
    };

    const W = () => window.innerWidth;
    const H = () => window.innerHeight;
    function tick() {
      cx!.clearRect(0, 0, W(), H());
      if (tone === "roast" && !reduce) {
        dz++;
        if (dz % 6 === 0) spawn(Math.random() * W(), -12, 2); // 常驻飘落
      }
      parts = parts.filter((p) => p.life > 0 && p.y < H() + 40);
      for (const p of parts) {
        p.vy += p.g;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.life -= 0.004;
        cx!.save();
        cx!.translate(p.x, p.y);
        cx!.rotate(p.rot);
        cx!.globalAlpha = Math.max(0, Math.min(1, p.life));
        cx!.fillStyle = p.c;
        cx!.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.55);
        cx!.restore();
      }
      raf = requestAnimationFrame(tick);
    }
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.__djBurst = undefined;
      window.__djGold = undefined;
    };
  }, [tone]);

  return (
    <>
      <canvas ref={canvasRef} className="fx-confetti" aria-hidden="true" />
      <div className={`fx-gold ${gold ? "on" : ""}`} aria-hidden="true" />
      {tone === "serious" ? <GiltTicker /> : null}
    </>
  );
}

function GiltTicker() {
  const items = [
    "DEJA ▲ 2.4", "VIEW ▲ 0.8", "DUP ▼ 1.2", "AU·GOLD ▲ 5.0", "M&A ▲ 3.3",
    "IPO ▼ 0.4", "EBITDA ▲ 1.1", "ALPHA ▲ 2.0", "MOAT ▼ 0.9", "YIELD ▲ 4.2",
    "WHEEL ▼ 7.7", "NOVEL ▲ 0.3",
  ];
  const row = [...items, ...items];
  return (
    <div className="fx-ticker" aria-hidden="true">
      <div className="fx-ticker-track">
        {row.map((t, i) => (
          <span key={i} className={t.includes("▲") ? "up" : "down"}>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
