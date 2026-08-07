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
  seenIntro: boolean; // 是否看过项目介绍页
  setTone: (t: Tone) => void;
  enterIntro: () => void; // 从介绍页进入 → 选择审判官
  backToIntro: () => void; // 从大门退回介绍页（退一步）
  reset: () => void; // 回到开场重新选审判官（保留已看过介绍）
  restart: () => void; // 从最开始（介绍页）重新来过
};

const Ctx = createContext<ToneCtx>({
  tone: null,
  ready: false,
  seenIntro: false,
  setTone: () => {},
  enterIntro: () => {},
  backToIntro: () => {},
  reset: () => {},
  restart: () => {},
});

export const PERSONA: Record<Tone, { name: string; venue: string; emoji: string }> = {
  serious: { name: "镀金", venue: "华尔街 · 评级委员会", emoji: "💰" },
  roast: { name: "毒舌", venue: "马戏团 · 嘲讽现场", emoji: "🤡" },
  comfort: { name: "彩虹", venue: "夸夸群 · 无条件捧场", emoji: "🌈" },
};

// 三世界循环顺序(顶栏"换脸"按钮用)
export const TONE_CYCLE: Tone[] = ["serious", "roast", "comfort"];

const INTRO_KEY = "dejaview_intro";

export function ToneProvider({ children }: { children: ReactNode }) {
  const [tone, setToneState] = useState<Tone | null>(null);
  const [ready, setReady] = useState(false);
  const [seenIntro, setSeenIntro] = useState(false);

  // 恢复上次选择；?world=roast|serious(或 clown|gilt)可强制指定, 便于深链/分享。
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const w = q.get("world") || q.get("tone");
    const forced: Tone | null =
      w === "roast" || w === "clown" ? "roast" : w === "serious" || w === "gilt" ? "serious" : null;
    const saved = window.localStorage.getItem(KEY);
    const init = forced ?? (saved === "roast" || saved === "serious" ? (saved as Tone) : null);
    if (init) setToneState(init);
    // 有世界(深链/老用户)或看过介绍 → 跳过介绍页
    if (init || window.localStorage.getItem(INTRO_KEY) === "1") setSeenIntro(true);
    setReady(true);
  }, []);

  const enterIntro = useCallback(() => {
    window.localStorage.setItem(INTRO_KEY, "1");
    setSeenIntro(true);
  }, []);

  // 同步到 <html data-tone> + 存储；未选世界时(介绍/大门)统一深色戏台 data-splash
  useEffect(() => {
    const el = document.documentElement;
    if (tone) {
      el.dataset.tone = tone;
      delete el.dataset.splash;
      window.localStorage.setItem(KEY, tone);
    } else {
      delete el.dataset.tone;
      el.dataset.splash = "1";
    }
  }, [tone]);

  const setTone = useCallback((t: Tone) => setToneState(t), []);
  // 退一步：大门 → 介绍页
  const backToIntro = useCallback(() => {
    window.localStorage.removeItem(INTRO_KEY);
    window.localStorage.removeItem(KEY);
    setToneState(null);
    setSeenIntro(false);
  }, []);
  const reset = useCallback(() => {
    window.localStorage.removeItem(KEY);
    setToneState(null);
  }, []);
  // 从最开始重新来过：清掉世界 + 介绍标记，整页回到介绍页
  const restart = useCallback(() => {
    window.localStorage.removeItem(KEY);
    window.localStorage.removeItem(INTRO_KEY);
    window.location.href = "/";
  }, []);

  return (
    <Ctx.Provider value={{ tone, ready, seenIntro, setTone, enterIntro, backToIntro, reset, restart }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTone() {
  return useContext(Ctx);
}
