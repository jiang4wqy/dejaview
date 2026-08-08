"use client";

import DemoPicker from "./DemoPicker";
import { INTRO_STEPS } from "@/lib/showcase-data";
import { useTone } from "@/lib/tone";

export default function Intro() {
  const { enterIntro } = useTone();
  return (
    <div className="intro">
      <div className="intro-inner">
        <span className="intro-kicker rise" style={{ animationDelay: "0s" }}>
          DEJAVIEW · 证据化项目锐评
        </span>
        <h1 className="intro-title rise" style={{ animationDelay: ".05s" }}>
          你的项目，是不是<br />又一个<span className="intro-hl">「轮子」</span>？
        </h1>
        <p className="intro-lede rise" style={{ animationDelay: ".12s" }}>
          把公开网址或 GitHub 丢进来，DejaView 会提取项目指纹、搜索并核验同类，再用六个维度判断
          <b>重复造轮子</b>的程度——结论带证据，语气会变，事实不会变。
        </p>

        <div className="intro-steps rise" style={{ animationDelay: ".2s" }}>
          {INTRO_STEPS.map((step) => (
            <div key={step.number} className="intro-step">
              <div className="intro-step-n">{step.number}</div>
              <div className="intro-step-t">{step.title}</div>
              <div className="intro-step-d">{step.description}</div>
            </div>
          ))}
        </div>

        <div className="intro-vs-label rise" style={{ animationDelay: ".24s" }}>
          同一份事实，三副面孔 →
        </div>
        <div className="intro-teasers rise" style={{ animationDelay: ".28s" }}>
          <div className="intro-teaser tz-gilt">
            <span className="tz-emoji">💰</span>
            <b>镀金 · 华尔街</b>
            <span>体面地告诉你值几个钱</span>
          </div>
          <div className="intro-teaser tz-clown">
            <span className="tz-emoji">🤡</span>
            <b>毒舌 · 马戏团</b>
            <span>当着全场拆穿你的轮子</span>
          </div>
          <div className="intro-teaser tz-comfort">
            <span className="tz-emoji">🌈</span>
            <b>彩虹 · 夸夸群</b>
            <span>无条件捧你、专治 emo</span>
          </div>
        </div>

        <div className="intro-cta-row rise" style={{ animationDelay: ".36s" }}>
          <button type="button" className="intro-cta" onClick={enterIntro}>
            开始审判 · 选择人格 →
          </button>
          <span className="intro-note">MIT 开源 · 默认 mock 零成本运行 · 锐评项目，不攻击开发者</span>
        </div>
        <div className="intro-demos rise" style={{ animationDelay: ".4s" }}>
          <DemoPicker />
        </div>
      </div>
    </div>
  );
}
