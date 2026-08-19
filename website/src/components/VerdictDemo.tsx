import { useEffect, useRef, useState } from 'react'
import { useLang } from '../lib/lang'
import { useInView } from '../hooks/useInView'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { Reveal } from './Reveal'
import { GithubIcon, StarIcon } from './icons'

const TARGET = 0.65
const R = 78
const C = 2 * Math.PI * R

/** Circular duplication dial that counts up to 65% the first time it enters view. */
function Dial({ play }: { play: boolean }) {
  const reduced = usePrefersReducedMotion()
  const [frac, setFrac] = useState(reduced ? TARGET : 0)
  const started = useRef(false)

  useEffect(() => {
    if (reduced) { setFrac(TARGET); return }
    if (!play || started.current) return
    started.current = true
    const duration = 1400
    let raf = 0
    let startTs = 0
    const tick = (ts: number) => {
      if (!startTs) startTs = ts
      const p = Math.min(1, (ts - startTs) / duration)
      // easeOutCubic
      const eased = 1 - Math.pow(1 - p, 3)
      setFrac(TARGET * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [play, reduced])

  const pct = Math.round(frac * 100)
  return (
    <div className="dial" role="img" aria-label={`${Math.round(TARGET * 100)}%`}>
      <svg viewBox="0 0 180 180" width="180" height="180">
        <defs>
          <linearGradient id="dial-g" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#FF4D45" />
            <stop offset="1" stopColor="#FF4D8D" />
          </linearGradient>
        </defs>
        <circle cx="90" cy="90" r={R} className="dial-track" />
        <circle
          cx="90"
          cy="90"
          r={R}
          className="dial-value"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - frac)}
          transform="rotate(-90 90 90)"
        />
      </svg>
      <div className="dial-center">
        <span className="dial-pct">{pct}<i>%</i></span>
      </div>
    </div>
  )
}

export function VerdictDemo() {
  const { t } = useLang()
  const v = t.verdict
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0, rootMargin: '0px 0px -20% 0px' })

  return (
    <section className="verdict" id="verdict">
      <div className="container">
        <Reveal className="section-head">
          <span className="eyebrow">
            <span className="eyebrow-tick" aria-hidden />
            {v.badge}
          </span>
          <h2 className="section-title">{v.heading}</h2>
          <p className="section-sub">{v.sub}</p>
        </Reveal>

        <div className="verdict-card" ref={ref}>
          <div className="verdict-filetab">
            <span className="verdict-exhibit">{v.exhibitLabel}</span>
            <a className="verdict-subject" href={v.subjectUrl} target="_blank" rel="noreferrer">
              <GithubIcon width={16} height={16} />
              {v.subject}
            </a>
          </div>

          <div className="verdict-oneliner">
            <span className="verdict-oneliner-label">{v.oneLinerLabel}</span>
            <span className="verdict-oneliner-text">{v.oneLiner}</span>
          </div>

          <div className="verdict-main">
            <div className="verdict-score">
              <Dial play={inView} />
              <div className="verdict-score-meta">
                <span className="verdict-score-label">{v.scoreLabel}</span>
                <span className="verdict-score-verdict">{v.scoreVerdict}</span>
                <span className="verdict-conf">
                  {v.confidenceLabel}: <b>{v.confidence}</b>
                </span>
              </div>
            </div>

            <div className="verdict-dims">
              <h4 className="verdict-block-title">{v.dimsTitle}</h4>
              <ul className="dim-list">
                {v.dims.map((d) => (
                  <li className="dim-row" key={d.label}>
                    <span className="dim-label">{d.label}</span>
                    <span className="dim-bar">
                      <span
                        className="dim-bar-fill"
                        style={{ width: inView ? `${Math.round(d.value * 100)}%` : '0%' }}
                      />
                    </span>
                    <span className="dim-val">{Math.round(d.value * 100)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="verdict-lower">
            <div className="verdict-competitors">
              <h4 className="verdict-block-title">{v.competitorsTitle}</h4>
              <ul className="comp-list">
                {v.competitors.map((c) => (
                  <li className="comp-row" key={c.name}>
                    <a className="comp-name" href={c.url} target="_blank" rel="noreferrer">
                      {c.name}
                    </a>
                    <span className="comp-meta">
                      <span className={`comp-rel${c.relation.includes('直接') || c.relation.includes('Direct') ? ' is-direct' : ''}`}>
                        {c.relation}
                      </span>
                      <span className="comp-stars">
                        <StarIcon width={13} height={13} /> {c.stars}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="verdict-evidence">
              <h4 className="verdict-block-title">{v.evidenceTitle}</h4>
              <ul className="ev-list">
                {v.evidence.map((e, i) => (
                  <li className="ev-item" key={i}>
                    <p className="ev-quote">“{e.quote}”</p>
                    <p className="ev-meta">
                      <span className="ev-source">{e.source}</span>
                      <span className="ev-conf">{e.confidence}</span>
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="verdict-disclaimer">{v.disclaimer}</p>
        </div>
      </div>
    </section>
  )
}
