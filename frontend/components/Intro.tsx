"use client";

import DemoPicker from "./DemoPicker";
import { getIntroSteps } from "@/lib/showcase-data";
import { useTone } from "@/lib/tone";
import { useLang } from "@/lib/i18n";

export default function Intro() {
  const { enterIntro } = useTone();
  const { t } = useLang();
  const introSteps = getIntroSteps(t);
  return (
    <div className="intro">
      <div className="intro-inner">
        <span className="intro-kicker rise" style={{ animationDelay: "0s" }}>
          DEJAVIEW · {t("brand.tagline")}
        </span>
        <h1 className="intro-title rise" style={{ animationDelay: ".05s" }}>
          {t("intro.titleLine1")}<br />{t("intro.titleLead")}<span className="intro-hl">{t("intro.titleHighlight")}</span>{t("intro.titleSuffix")}
        </h1>
        <p className="intro-lede rise" style={{ animationDelay: ".12s" }}>
          {t("intro.ledePrefix")}
          <b>{t("intro.ledeBold")}</b>{t("intro.ledeSuffix")}
        </p>

        <div className="intro-steps rise" style={{ animationDelay: ".2s" }}>
          {introSteps.map((step) => (
            <div key={step.number} className="intro-step">
              <div className="intro-step-n">{step.number}</div>
              <div className="intro-step-t">{step.title}</div>
              <div className="intro-step-d">{step.description}</div>
            </div>
          ))}
        </div>

        <div className="intro-vs-label rise" style={{ animationDelay: ".24s" }}>
          {t("intro.vsLabel")}
        </div>
        <div className="intro-teasers rise" style={{ animationDelay: ".28s" }}>
          <div className="intro-teaser tz-gilt">
            <span className="tz-emoji">💰</span>
            <b>{t("intro.teaserSeriousLabel")}</b>
            <span>{t("intro.teaserSeriousDesc")}</span>
          </div>
          <div className="intro-teaser tz-clown">
            <span className="tz-emoji">🤡</span>
            <b>{t("intro.teaserRoastLabel")}</b>
            <span>{t("intro.teaserRoastDesc")}</span>
          </div>
          <div className="intro-teaser tz-comfort">
            <span className="tz-emoji">🌈</span>
            <b>{t("intro.teaserComfortLabel")}</b>
            <span>{t("intro.teaserComfortDesc")}</span>
          </div>
        </div>

        <div className="intro-cta-row rise" style={{ animationDelay: ".36s" }}>
          <button type="button" className="intro-cta" onClick={enterIntro}>
            {t("intro.cta")}
          </button>
          <span className="intro-note">{t("intro.note")}</span>
        </div>
        <div className="intro-demos rise" style={{ animationDelay: ".4s" }}>
          <DemoPicker />
        </div>
      </div>
    </div>
  );
}
