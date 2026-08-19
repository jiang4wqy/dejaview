import { useCallback, useEffect, useState } from 'react'
import { useLang } from '../lib/lang'
import { GITHUB_URL } from '../content/copy'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { ArrowDownIcon, StarIcon } from './icons'

/** The staged "project scan terminal" — pure CSS/DOM, replays predefined content. */
function ScanTerminal() {
  const { t } = useLang()
  const reduced = usePrefersReducedMotion()
  const stages = t.terminal.stages
  const total = stages.length

  const [revealed, setRevealed] = useState(reduced ? total : 0)

  // Reset when motion preference or language changes.
  useEffect(() => {
    setRevealed(reduced ? total : 0)
  }, [reduced, total])

  useEffect(() => {
    if (reduced || revealed >= total) return
    const delay = revealed === 0 ? 480 : 1150
    const id = window.setTimeout(() => setRevealed(r => Math.min(total, r + 1)), delay)
    return () => window.clearTimeout(id)
  }, [revealed, reduced, total])

  const done = revealed >= total
  const replay = useCallback(() => setRevealed(0), [])

  return (
    <div className={`scan${done ? ' is-done' : ' is-running'}`} aria-hidden>
      <div className="scan-chrome">
        <span className="scan-dot" />
        <span className="scan-dot" />
        <span className="scan-dot" />
        <span className="scan-case">
          {t.terminal.caseLabel} №33E72476 · {t.terminal.title}
        </span>
        <span className={`scan-status${done ? ' done' : ''}`}>
          {done ? t.terminal.doneLabel : t.terminal.runningLabel}
        </span>
      </div>

      <div className="scan-body">
        {stages.slice(0, revealed).map((stage, i) => {
          const isLast = i === revealed - 1
          return (
            <div className="scan-stage" key={stage.label}>
              <span className="scan-stage-label">{stage.label}</span>
              <div className="scan-lines">
                {stage.lines.map((line, j) => (
                  <div className="scan-line" key={j}>
                    {line}
                    {!done && isLast && j === stage.lines.length - 1 ? (
                      <span className="scan-caret" />
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
        {!reduced ? <span className="scan-sweep" /> : null}
      </div>

      {done && !reduced ? (
        <button type="button" className="scan-replay" onClick={replay}>
          ↺ {t.terminal.replay}
        </button>
      ) : null}
    </div>
  )
}

export function Hero() {
  const { t } = useLang()
  return (
    <section className="hero" id="top">
      <div className="container hero-inner">
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="eyebrow-tick" aria-hidden />
            {t.hero.badge}
          </span>
          <h1 className="hero-title">
            {t.hero.titleLines.map((line, i) => (
              <span
                className={`hero-line${i === t.hero.titleLines.length - 1 ? ' hero-line-accent' : ''}`}
                style={{ animationDelay: `${0.08 + i * 0.12}s` }}
                key={i}
              >
                {line}
              </span>
            ))}
          </h1>
          <p className="hero-sub">{t.hero.sub}</p>
          <div className="hero-ctas">
            <a className="btn btn-primary btn-lg" href={GITHUB_URL} target="_blank" rel="noreferrer">
              <StarIcon width={18} height={18} />
              {t.hero.primaryCta}
            </a>
            <a className="btn btn-ghost btn-lg" href="#workflow">
              {t.hero.secondaryCta}
              <ArrowDownIcon width={18} height={18} />
            </a>
          </div>
          <p className="hero-note">{t.hero.note}</p>
        </div>

        <div className="hero-visual">
          <ScanTerminal />
        </div>
      </div>
    </section>
  )
}
