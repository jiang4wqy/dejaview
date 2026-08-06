"use client";

// 全局"世界/语气"状态：serious=镀金·华尔街，roast=毒舌·马戏团。
// 单一事实来源：tone 决定整站换肤（写到 <html data-tone>），并持久化到 localStorage。
// 开场 <WorldGate> 选定初值；报告页的一键切换直接改它，于是整页在两个世界间变形。
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Tone } from "./types";

const KEY = "dejaview_tone";

type ToneCtx = {
  tone: Tone | null; // null = 尚未选择 → 显示开场大门
  ready: boolean; // 是否已完成 localStorage 恢复（避免 SSR/首帧闪烁）
  setTone: (t: Tone) => void;
  reset: () => void; // 回到开场重新选审判官
};

const Ctx = createContext<ToneCtx>({
  tone: null,
  ready: false,
  setTone: () => {},
  reset: () => {},
});

export const PERSONA: Record<Tone, { name: string; venue: string; emoji: string }> = {
  serious: { name: "镀金", venue: "华尔街 · 评级委员会", emoji: "💰" },
  roast: { name: "毒舌", venue: "马戏团 · 嘲讽现场", emoji: "🤡" },
};

export function ToneProvider({ children }: { children: ReactNode }) {
  const [tone, setToneState] = useState<Tone | null>(null);
  const [ready, setReady] = useState(false);

  // 恢复上次选择；?world=roast|serious(或 clown|gilt)可强制指定, 便于深链/分享。
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const w = q.get("world") || q.get("tone");
    const forced: Tone | null =
      w === "roast" || w === "clown" ? "roast" : w === "serious" || w === "gilt" ? "serious" : null;
    const saved = window.localStorage.getItem(KEY);
    const init = forced ?? (saved === "roast" || saved === "serious" ? (saved as Tone) : null);
    if (init) setToneState(init);
    setReady(true);
  }, []);

  // 同步到 <html data-tone> + 存储
  useEffect(() => {
    const el = document.documentElement;
    if (tone) {
      el.dataset.tone = tone;
      window.localStorage.setItem(KEY, tone);
    } else {
      delete el.dataset.tone;
    }
  }, [tone]);

  const setTone = useCallback((t: Tone) => setToneState(t), []);
  const reset = useCallback(() => {
    window.localStorage.removeItem(KEY);
    setToneState(null);
  }, []);

  return <Ctx.Provider value={{ tone, ready, setTone, reset }}>{children}</Ctx.Provider>;
}

export function useTone() {
  return useContext(Ctx);
}
