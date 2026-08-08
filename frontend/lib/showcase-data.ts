import type { Tone } from "./types";

export const HERO: Record<
  Tone,
  { kicker: string; lead: string; highlight: string; description: string; submit: string }
> = {
  roast: {
    kicker: "🤡 当前审判官 · 马戏团 · 嘲讽现场",
    lead: "把项目交出来，",
    highlight: "当众处刑",
    description: "马戏团今晚开庭：扒项目指纹、翻竞品、拆穿那点「创新」——每句嘲讽都钉着证据。",
    submit: "拉开帷幕，开嘲 →",
  },
  serious: {
    kicker: "💰 当前审判官 · 华尔街 · 评级委员会",
    lead: "递上你的项目，",
    highlight: "接受估值",
    description: "评级委员会开始尽调：提炼指纹、对标竞品、给出重复度评级与改进优先级——每条结论皆可追溯。",
    submit: "呈上评审，开鉴 →",
  },
  comfort: {
    kicker: "🌈 当前审判官 · 夸夸群 · 无条件捧场",
    lead: "把项目交出来，",
    highlight: "被夸到起飞",
    description: "夸夸群全员为你拍彩虹屁：只夸不评、无条件捧场、专治 emo——纯情绪价值，不替代事实判断。",
    submit: "求夸，走一个 →",
  },
};

export const DEMOS = [
  { slug: "gitingest", label: "Gitingest", duplication: "0.65" },
  { slug: "excalidraw", label: "Excalidraw", duplication: "0.60" },
  { slug: "kutt", label: "Kutt", duplication: "0.15" },
] as const;

export const EXAMPLE_PROJECTS = [
  {
    label: "Gitingest",
    website: "https://gitingest.com",
    github: "https://github.com/cyclotruc/gitingest",
    users: "用 LLM 处理代码库的开发者",
    problem: "把 GitHub 仓库转成适合喂给 LLM 的文本",
    novelty: "改 URL 的 hub→ingest 一键转换",
  },
  {
    label: "Excalidraw",
    website: "https://excalidraw.com",
    github: "https://github.com/excalidraw/excalidraw",
    users: "需要快速画图的团队",
    problem: "手绘风白板 / 图表",
    novelty: "手绘质感 + 端到端加密协作",
  },
  {
    label: "Umami",
    website: "https://umami.is",
    github: "https://github.com/umami-software/umami",
    users: "在意隐私的网站主",
    problem: "隐私友好的网站分析",
    novelty: "无 cookie / 可自托管",
  },
] as const;

export const INTRO_STEPS = [
  { number: "01", title: "提取指纹", description: "扒出项目的真正内核，不看营销话术" },
  { number: "02", title: "检索同类", description: "全网找出在做同一件事的项目" },
  { number: "03", title: "判重复度", description: "六个维度打分，算清重合与新意" },
  { number: "04", title: "出锐评", description: "给出有出处的问题与改进建议" },
] as const;

export const WORLD_OPTIONS: ReadonlyArray<{
  tone: Tone;
  emoji: string;
  name: string;
  venue: string;
  description: string;
  action: string;
  className: string;
}> = [
  {
    tone: "serious",
    emoji: "💰",
    name: "镀金",
    venue: "华尔街 · 评级委员会",
    description: "西装、黄金与股票机。体面地告诉你，这轮子值几个钱。",
    action: "推门而入 →",
    className: "door-gilt",
  },
  {
    tone: "roast",
    emoji: "🤡",
    name: "毒舌",
    venue: "马戏团 · 嘲讽现场",
    description: "彩带、汽笛与暴击。当着全场，把你的轮子拆穿。",
    action: "掀开帐篷 →",
    className: "door-clown",
  },
  {
    tone: "comfort",
    emoji: "🌈",
    name: "彩虹",
    venue: "夸夸群 · 无条件捧场",
    description: "只夸不评、彩虹屁拉满。专治 emo，给你无条件的爱。",
    action: "抱抱我 →",
    className: "door-comfort",
  },
];
