"use client";

// 项目介绍页（最开始）：一句话讲清 DejaView 干嘛、怎么工作、双语气梗，然后引导选审判官。
// 中性但有辨识度的排版（此时还没选世界）；从下而上的克制入场动画。
import { useTone } from "@/lib/tone";

const STEPS = [
  { n: "01", t: "提取指纹", d: "扒出你项目的真正内核，不看营销话术" },
  { n: "02", t: "检索同类", d: "全网找出干着同一件事的家伙" },
  { n: "03", t: "判重复度", d: "六个维度打分，算算你有多「缝合」" },
  { n: "04", t: "出锐评", d: "带证据的问题与改进，能追溯到出处" },
];

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
          把网址和 GitHub 丢进来，AI 会扒出它的核心、全网找同类，告诉你到底有多少是
          <b>重复造轮子</b>——每一句结论都钉着证据，点开就能查。
        </p>

        <div className="intro-steps rise" style={{ animationDelay: ".2s" }}>
          {STEPS.map((s) => (
            <div key={s.n} className="intro-step">
              <div className="intro-step-n">{s.n}</div>
              <div className="intro-step-t">{s.t}</div>
              <div className="intro-step-d">{s.d}</div>
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
            选择你的审判官 →
          </button>
          <span className="intro-note">刻薄可以主观，事实不能主观 · 锐评项目，不攻击开发者本人</span>
        </div>
      </div>
    </div>
  );
}
