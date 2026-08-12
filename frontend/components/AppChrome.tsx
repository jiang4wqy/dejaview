"use client";

// 客户端外壳：注入世界主题上下文、语言上下文、世界感知的顶栏、全局特效层。
import type { ReactNode } from "react";
import Link from "next/link";
import { personaOf, TONE_CYCLE, ToneProvider, useTone } from "@/lib/tone";
import { LangProvider, useLang } from "@/lib/i18n";
import AccessGate from "./AccessGate";
import WorldFx from "./WorldFx";

// 中 / EN 切换：全局可用，紧挨语气胶囊放置；点击即切换 + 落 localStorage。
function LangToggle() {
  const { lang, setLang, t } = useLang();
  return (
    <button
      type="button"
      className="lang-pill"
      onClick={() => setLang(lang === "zh" ? "en" : "zh")}
      aria-label={t("topbar.langSwitchAria")}
      title={t("topbar.langSwitchAria")}
    >
      <span className={lang === "zh" ? "on" : ""}>中</span>
      <span className="lang-sep" aria-hidden="true">/</span>
      <span className={lang === "en" ? "on" : ""}>EN</span>
    </button>
  );
}

function TopBar() {
  const { tone, setTone, restart } = useTone();
  const { t } = useLang();
  const next = tone ? TONE_CYCLE[(TONE_CYCLE.indexOf(tone) + 1) % TONE_CYCLE.length] : "serious";
  return (
    <header className="app-topbar">
      <div className="app-topbar-inner">
        <Link href="/" className="brand">
          <span className="dot" aria-hidden="true" />
          DejaView <small>{t("topbar.tagline")}</small>
        </Link>
        <div className="topbar-actions">
          <nav className="topbar-nav" aria-label={t("topbar.navAriaLabel")}>
            <Link href="/report/demo-gitingest">{t("topbar.demo")}</Link>
            <a
              href="https://github.com/jiang4wqy/dejaview/blob/main/docs/DEPLOYMENT.md"
              target="_blank"
              rel="noreferrer noopener"
            >
              {t("topbar.deploy")}
            </a>
            <a
              href="https://github.com/jiang4wqy/dejaview"
              target="_blank"
              rel="noreferrer noopener"
            >
              {t("topbar.github")}
            </a>
          </nav>
          <div className="topbar-tools">
            {tone ? (
              <>
                <button className="topbar-restart" onClick={restart} title={t("topbar.restartTitle")}>
                  {t("topbar.restart")}
                </button>
                <button
                  className="persona-pill"
                  onClick={() => setTone(next)}
                  title={t("topbar.personaSwitchTitle", { name: personaOf(t, next).name })}
                >
                  <span className="persona-emoji">{personaOf(t, tone).emoji}</span>
                  <span className="persona-name">{personaOf(t, tone).name}</span>
                  <span className="persona-swap">
                    {t("topbar.personaSwap", { emoji: personaOf(t, next).emoji })}
                  </span>
                </button>
              </>
            ) : null}
            <LangToggle />
          </div>
        </div>
      </div>
    </header>
  );
}

export default function AppChrome({ children }: { children: ReactNode }) {
  return (
    <LangProvider>
      <ToneProvider>
        <AccessGate>
          <div className="stage-fx" aria-hidden="true">
            <span className="fx-spot a" />
            <span className="fx-spot b" />
          </div>
          <div className="fx-grain" aria-hidden="true" />
          <WorldFx />
          <TopBar />
          <main className="main">{children}</main>
        </AccessGate>
      </ToneProvider>
    </LangProvider>
  );
}
