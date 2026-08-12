"use client";

import DemoPicker from "@/components/DemoPicker";
import Intro from "@/components/Intro";
import ProjectForm from "@/components/ProjectForm";
import WorldGate from "@/components/WorldGate";
import { HERO } from "@/lib/showcase-data";
import { useTone } from "@/lib/tone";
import { useLang } from "@/lib/i18n";

export default function HomePage() {
  const { tone, ready, seenIntro, reset } = useTone();
  const { t } = useLang();

  if (!ready) {
    return <div className="page-loading" role="status">{t("home.loading")}</div>;
  }
  if (!seenIntro) return <Intro />;
  if (!tone) return <WorldGate />;

  const hero = HERO[tone];
  return (
    <div className="home">
      <button type="button" className="home-back" onClick={reset}>
        {t("home.back")}
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
        <div className="home-flow" aria-label={t("home.flowAriaLabel")}>
          <span>{t("home.flow.fingerprint")}</span>
          <span>{t("home.flow.search")}</span>
          <span>{t("home.flow.verify")}</span>
          <span>{t("home.flow.judge")}</span>
        </div>
      </section>

      <ProjectForm tone={tone} submitLabel={hero.submit} />
    </div>
  );
}
