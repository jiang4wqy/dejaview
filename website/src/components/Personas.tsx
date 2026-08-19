import { useState } from 'react'
import { useLang } from '../lib/lang'
import type { Persona } from '../content/copy'
import { Reveal } from './Reveal'
import seriousShot from '../assets/world-serious.png'
import roastShot from '../assets/world-roast.png'
import comfortShot from '../assets/world-comfort.png'

const SHOTS: Record<Persona['id'], string> = {
  serious: seriousShot,
  roast: roastShot,
  comfort: comfortShot,
}

export function Personas() {
  const { t } = useLang()
  const p = t.personas
  const [active, setActive] = useState<Persona['id']>('roast')
  const current = p.personas.find((x) => x.id === active) ?? p.personas[0]

  return (
    <section className="personas" id="personas" data-persona={active}>
      <div className="container">
        <Reveal className="section-head">
          <span className="eyebrow">
            <span className="eyebrow-tick" aria-hidden />
            {p.badge}
          </span>
          <h2 className="section-title">{p.heading}</h2>
          <p className="section-sub">{p.sub}</p>
        </Reveal>

        <Reveal className="persona-stage">
          <div className="persona-switch" role="tablist" aria-label={p.badge}>
            {p.personas.map((persona) => (
              <button
                key={persona.id}
                type="button"
                role="tab"
                aria-selected={active === persona.id}
                className={`persona-tab persona-tab-${persona.id}${active === persona.id ? ' is-active' : ''}`}
                onClick={() => setActive(persona.id)}
              >
                <span className="persona-mark" aria-hidden>{persona.mark}</span>
                <span className="persona-tab-text">
                  <span className="persona-tab-name">{persona.name}</span>
                  <span className="persona-tab-sub">{persona.sub}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="persona-panel" role="tabpanel">
            <div className="persona-report">
              <span className="persona-report-tag">
                <span className="persona-mark" aria-hidden>{current.mark}</span>
                {current.name}
              </span>
              <h3 className="persona-headline">{current.headline}</h3>
              <p className="persona-verdict">{current.verdict}</p>
              <div className="persona-shot">
                <img
                  src={SHOTS[current.id]}
                  width={760}
                  height={606}
                  alt={current.name}
                  loading="lazy"
                />
              </div>
            </div>

            <aside className="persona-facts">
              <span className="persona-facts-title">{p.factLayerTitle}</span>
              <ul className="persona-facts-list">
                {p.facts.map((f) => (
                  <li key={f.label}>
                    <span className="persona-fact-label">{f.label}</span>
                    <span className="persona-fact-value">{f.value}</span>
                  </li>
                ))}
              </ul>
              <p className="persona-facts-note">{p.footnote}</p>
            </aside>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
