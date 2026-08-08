"use client";

import DemoPicker from "@/components/DemoPicker";
import Intro from "@/components/Intro";
import ProjectForm from "@/components/ProjectForm";
import WorldGate from "@/components/WorldGate";
import { HERO } from "@/lib/showcase-data";
import { useTone } from "@/lib/tone";

export default function HomePage() {
  const { tone, ready, seenIntro, reset } = useTone();

  if (!ready) {
    return <div className="page-loading" role="status">正在打开卷宗…</div>;
  }
  if (!seenIntro) return <Intro />;
  if (!tone) return <WorldGate />;

  const hero = HERO[tone];
  return (
    <div className="home">
      <button type="button" className="home-back" onClick={reset}>
        ← 换个审判官
      </button>
      <section className="home-hero" aria-labelledby="home-title">
        <span className="home-kicker rise">{hero.kicker}</span>
        <h1 className="home-title rise" id="home-title" style={{ animationDelay: ".05s" }}>
          {hero.lead}<span className="hl">{hero.highlight}</span>
        </h1>
        <p className="home-sub rise" style={{ animationDelay: ".1s" }}>
          {hero.description}
        </p>
        <DemoPicker compact />
        <div className="home-flow" aria-label="分析流程">
          <span>提取指纹</span>
          <span>搜索同类</span>
          <span>验证证据</span>
          <span>裁判重复度</span>
        </div>
      </section>

      <ProjectForm tone={tone} submitLabel={hero.submit} />
    </div>
  );
}
