"use client";

// 全局特效层（挂在 layout）—— 加狂版：
//  毒舌世界：canvas 彩带 + 飘带 + 气球/小丑 emoji 上升 + 光标彩带拖尾 + 点击炸屏 + 抖屏。
//  镀金世界：上升金尘（闪烁）+ 光标金粉拖尾 + 提交金光扫屏 + 金币喷泉 + 顶部股票滚动条。
// 单例 canvas 常驻，按当前 tone 决定粒子种类；尊重 prefers-reduced-motion。
import { useEffect, useRef, useState } from "react";
import { useTone } from "@/lib/tone";

const CLOWN = ["#ff2e88", "#00f5a0", "#ffe600", "#00e5ff", "#b14aff", "#ff7a00"];
const GOLD = ["#f2dd93", "#d4af37", "#fff6d8", "#e9c96a"];
const BALLOONS = ["🎈", "🤡", "🎪", "🎠", "🎉", "🃏"];
const COINS = ["🪙", "💰", "💵", "📈", "💎"];
const HEARTS = ["💖", "💕", "✨", "🌈", "🥰", "💗", "⭐"];

type P = {
  x: number; y: number; vx: number; vy: number; g: number; r: number;
  c: string; rot: number; vr: number; life: number; decay: number;
  kind: "rect" | "ribbon" | "dust" | "emoji"; char?: string; tw: number;
};

export default function WorldFx() {
  const { tone } = useTone();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const toneRef = useRef(tone);
  toneRef.current = tone; // 让常驻 rAF 读到最新世界
  const [gold, setGold] = useState(false);

  useEffect(() => {
    const cv = canvasRef.current;
    const cx = cv?.getContext("2d");
    if (!cv || !cx) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let parts: P[] = [];
    let f = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = () => window.innerWidth;
    const H = () => window.innerHeight;

    function resize() {
      cv!.width = W() * dpr; cv!.height = H() * dpr;
      cv!.style.width = W() + "px"; cv!.style.height = H() + "px";
      cx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    if (reduce) {
      window.__djBurst = () => undefined;
      window.__djGold = () => undefined;
      window.__djHearts = () => undefined;
      return () => {
        window.__djBurst = undefined;
        window.__djGold = undefined;
        window.__djHearts = undefined;
      };
    }
    window.addEventListener("resize", resize);

    const cap = () => { if (parts.length > 420) parts.splice(0, parts.length - 420); };
    const rnd = (a: string[]) => a[(Math.random() * a.length) | 0];

    function confetti(x: number, y: number, n: number) {
      for (let i = 0; i < n; i++) {
        const ribbon = Math.random() < 0.4;
        parts.push({ x, y, vx: (Math.random() - 0.5) * 14, vy: Math.random() * -14 - 2, g: 0.32,
          r: Math.random() * 8 + 4, c: rnd(CLOWN), rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.7,
          life: 1, decay: 0.006 + Math.random() * 0.004, kind: ribbon ? "ribbon" : "rect", tw: Math.random() * 6 });
      }
      cap();
    }
    function goldFountain(x: number, y: number) {
      for (let i = 0; i < 60; i++)
        parts.push({ x: x + (Math.random() - 0.5) * 80, y, vx: (Math.random() - 0.5) * 9, vy: Math.random() * -13 - 3,
          g: 0.34, r: Math.random() * 4 + 2, c: rnd(GOLD), rot: 0, vr: 0, life: 1, decay: 0.008, kind: "dust", tw: Math.random() * 6 });
      for (let i = 0; i < 9; i++)
        parts.push({ x: x + (Math.random() - 0.5) * 160, y: y + 20, vx: (Math.random() - 0.5) * 5, vy: Math.random() * -7 - 4,
          g: 0.3, r: 30, c: "", rot: 0, vr: (Math.random() - 0.5) * 0.2, life: 1, decay: 0.009, kind: "emoji", char: rnd(COINS), tw: 0 });
      cap();
    }
    function balloon() {
      // 从上往下飘落的 emoji
      parts.push({ x: Math.random() * W(), y: -34, vx: (Math.random() - 0.5) * 0.7, vy: 1.1 + Math.random(),
        g: 0.006, r: 34, c: "", rot: 0, vr: (Math.random() - 0.5) * 0.05, life: 1, decay: 0.0011, kind: "emoji", char: rnd(BALLOONS), tw: 0 });
    }
    function dust() {
      // 从上往下飘落的金尘
      parts.push({ x: Math.random() * W(), y: -8, vx: (Math.random() - 0.5) * 0.3, vy: 0.5 + Math.random() * 0.8,
        g: 0.002, r: Math.random() * 2.6 + 1, c: rnd(GOLD), rot: 0, vr: 0, life: 1, decay: 0.0011, kind: "dust", tw: Math.random() * 6 });
    }
    function hearts(x: number, y: number, n: number) {
      for (let i = 0; i < n; i++)
        parts.push({ x, y, vx: (Math.random() - 0.5) * 8, vy: Math.random() * -9 - 2, g: 0.16,
          r: Math.random() * 16 + 18, c: "", rot: (Math.random() - 0.5) * 0.6, vr: (Math.random() - 0.5) * 0.1,
          life: 1, decay: 0.008, kind: "emoji", char: rnd(HEARTS), tw: 0 });
      cap();
    }
    function shake() {
      document.body.classList.add("dj-shake");
      window.setTimeout(() => document.body.classList.remove("dj-shake"), 460);
    }

    window.__djBurst = (x?: number, y?: number) => {
      if (reduce) return;
      confetti(x ?? W() / 2, y ?? H() / 3, 150);
      shake();
    };
    window.__djGold = () => {
      setGold(true);
      window.setTimeout(() => setGold(false), 1150);
      if (!reduce) { goldFountain(W() / 2, H() * 0.55); shake(); }
    };
    window.__djHearts = (x?: number, y?: number) => {
      if (reduce) return;
      hearts(x ?? W() / 2, y ?? H() / 3, 46);
    };

    let lastMove = 0;
    function onMove(e: PointerEvent) {
      const now = e.timeStamp || 0;
      if (now - lastMove < 38) return;
      lastMove = now;
      const t = toneRef.current;
      if (reduce || !t) return;
      if (t === "roast")
        parts.push({ x: e.clientX, y: e.clientY, vx: (Math.random() - 0.5) * 2.4, vy: Math.random() * -2,
          g: 0.18, r: Math.random() * 5 + 3, c: rnd(CLOWN), rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.5,
          life: 1, decay: 0.02, kind: Math.random() < 0.4 ? "ribbon" : "rect", tw: 0 });
      else
        parts.push({ x: e.clientX, y: e.clientY, vx: (Math.random() - 0.5) * 1, vy: (Math.random() - 0.5) * 1,
          g: 0, r: Math.random() * 2 + 1.6, c: rnd(GOLD), rot: 0, vr: 0, life: 1, decay: 0.02, kind: "dust", tw: Math.random() * 6 });
      cap();
    }
    window.addEventListener("pointermove", onMove);

    function tick() {
      cx!.clearRect(0, 0, W(), H());
      f++;
      const t = toneRef.current;
      if (!reduce && t === "roast") {
        if (f % 4 === 0) confetti(Math.random() * W(), -12, 2); // 常驻飘落(更密)
        if (f % 85 === 0) balloon();
      }
      if (!reduce && t === "serious" && f % 2 === 0) dust();
      if (!reduce && t === "comfort" && f % 16 === 0)
        parts.push({ x: Math.random() * W(), y: -24, vx: (Math.random() - 0.5) * 0.5, vy: 0.6 + Math.random() * 0.7,
          g: 0.004, r: Math.random() * 10 + 14, c: "", rot: (Math.random() - 0.5) * 0.3, vr: (Math.random() - 0.5) * 0.04,
          life: 1, decay: 0.0012, kind: "emoji", char: rnd(HEARTS), tw: 0 });
      parts = parts.filter((p) => p.life > 0 && p.y < H() + 70 && p.y > -90);
      for (const p of parts) {
        p.vy += p.g; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= p.decay; p.tw += 0.2;
        if (p.kind === "ribbon") p.x += Math.sin(p.tw) * 1.3;
        const a = Math.max(0, Math.min(1, p.life));
        cx!.save();
        cx!.translate(p.x, p.y);
        if (p.kind === "emoji") {
          cx!.globalAlpha = a;
          cx!.font = p.r + "px serif";
          cx!.textAlign = "center";
          cx!.textBaseline = "middle";
          cx!.fillText(p.char!, 0, 0);
        } else if (p.kind === "dust") {
          cx!.globalAlpha = a * (0.45 + 0.55 * Math.abs(Math.sin(p.tw)));
          cx!.fillStyle = p.c;
          cx!.beginPath();
          cx!.arc(0, 0, p.r, 0, 7);
          cx!.fill();
        } else {
          cx!.globalAlpha = a;
          cx!.rotate(p.rot);
          cx!.fillStyle = p.c;
          const h = p.kind === "ribbon" ? p.r * 1.7 : p.r * 0.55;
          cx!.fillRect(-p.r / 2, -h / 2, p.r, h);
        }
        cx!.restore();
      }
      raf = requestAnimationFrame(tick);
    }
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.__djBurst = undefined;
      window.__djGold = undefined;
    };
    // 只初始化一次；世界切换经 toneRef 生效
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    "DEJA ▲ 2.4", "VIEW ▲ 0.8", "DUP ▼ 1.2", "AU·GOLD ▲ 5.0", "M&A ▲ 3.3", "IPO ▼ 0.4",
    "EBITDA ▲ 1.1", "ALPHA ▲ 2.0", "MOAT ▼ 0.9", "YIELD ▲ 4.2", "WHEEL ▼ 7.7", "NOVEL ▲ 0.3",
    "BURN ▼ 3.1", "RUNWAY ▼ 1.8", "TAM ▲ 9.9", "HYPE ▲ 6.6",
  ];
  const row = [...items, ...items];
  return (
    <div className="fx-ticker" aria-hidden="true">
      <div className="fx-ticker-track">
        {row.map((t, i) => (
          <span key={i} className={t.includes("▲") ? "up" : "down"}>{t}</span>
        ))}
      </div>
    </div>
  );
}
