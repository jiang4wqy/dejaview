import type { Tone } from "./types";
import type { TFunc } from "./i18n";

// 所有导出都是 get*(t) 函数而非静态常量：文案随界面语言变，t 来自调用方的 useLang()。

export function getHero(
  t: TFunc,
): Record<Tone, { kicker: string; lead: string; highlight: string; description: string; submit: string }> {
  return {
    roast: {
      kicker: `🤡 ${t("hero.currentJudge")} · ${t("persona.roastVenue")}`,
      lead: t("hero.roastLead"),
      highlight: t("hero.roastHighlight"),
      description: t("hero.roastDescription"),
      submit: t("hero.roastSubmit"),
    },
    serious: {
      kicker: `💰 ${t("hero.currentJudge")} · ${t("persona.seriousVenue")}`,
      lead: t("hero.seriousLead"),
      highlight: t("hero.seriousHighlight"),
      description: t("hero.seriousDescription"),
      submit: t("hero.seriousSubmit"),
    },
    comfort: {
      kicker: `🌈 ${t("hero.currentJudge")} · ${t("persona.comfortVenue")}`,
      lead: t("hero.comfortLead"),
      highlight: t("hero.comfortHighlight"),
      description: t("hero.comfortDescription"),
      submit: t("hero.comfortSubmit"),
    },
  };
}

export const DEMOS = [
  { slug: "gitingest", label: "Gitingest", duplication: "0.65" },
  { slug: "excalidraw", label: "Excalidraw", duplication: "0.60" },
  { slug: "kutt", label: "Kutt", duplication: "0.15" },
] as const;

export type ExampleProject = {
  label: string;
  website: string;
  github: string;
  users: string;
  problem: string;
  novelty: string;
};

export function getExampleProjects(t: TFunc): ExampleProject[] {
  return [
    {
      label: "Gitingest",
      website: "https://gitingest.com",
      github: "https://github.com/cyclotruc/gitingest",
      users: t("example.gitingestUsers"),
      problem: t("example.gitingestProblem"),
      novelty: t("example.gitingestNovelty"),
    },
    {
      label: "Excalidraw",
      website: "https://excalidraw.com",
      github: "https://github.com/excalidraw/excalidraw",
      users: t("example.excalidrawUsers"),
      problem: t("example.excalidrawProblem"),
      novelty: t("example.excalidrawNovelty"),
    },
    {
      label: "Umami",
      website: "https://umami.is",
      github: "https://github.com/umami-software/umami",
      users: t("example.umamiUsers"),
      problem: t("example.umamiProblem"),
      novelty: t("example.umamiNovelty"),
    },
  ];
}

export type IntroStep = { number: string; title: string; description: string };

export function getIntroSteps(t: TFunc): IntroStep[] {
  return [
    { number: "01", title: t("intro.step1Title"), description: t("intro.step1Desc") },
    { number: "02", title: t("intro.step2Title"), description: t("intro.step2Desc") },
    { number: "03", title: t("intro.step3Title"), description: t("intro.step3Desc") },
    { number: "04", title: t("intro.step4Title"), description: t("intro.step4Desc") },
  ];
}

export type WorldOption = {
  tone: Tone;
  emoji: string;
  name: string;
  venue: string;
  description: string;
  action: string;
  className: string;
};

export function getWorldOptions(t: TFunc): WorldOption[] {
  return [
    {
      tone: "serious",
      emoji: "💰",
      name: t("persona.seriousName"),
      venue: t("persona.seriousVenue"),
      description: t("gate.seriousDesc"),
      action: t("gate.seriousAction"),
      className: "door-gilt",
    },
    {
      tone: "roast",
      emoji: "🤡",
      name: t("persona.roastName"),
      venue: t("persona.roastVenue"),
      description: t("gate.roastDesc"),
      action: t("gate.roastAction"),
      className: "door-clown",
    },
    {
      tone: "comfort",
      emoji: "🌈",
      name: t("persona.comfortName"),
      venue: t("persona.comfortVenue"),
      description: t("gate.comfortDesc"),
      action: t("gate.comfortAction"),
      className: "door-comfort",
    },
  ];
}
