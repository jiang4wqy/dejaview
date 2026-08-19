import { useEffect, useRef, useState } from 'react'
import { useLang } from '../lib/lang'
import type { WorkflowStep } from '../content/copy'
import { Reveal } from './Reveal'
import { CrosshairIcon, FingerprintIcon, SearchIcon, ScaleIcon, DocIcon } from './icons'

const STEP_ICONS = [CrosshairIcon, FingerprintIcon, SearchIcon, ScaleIcon, DocIcon]

function DossierCard({ step, index }: { step: WorkflowStep; index: number }) {
  const Icon = STEP_ICONS[index] ?? CrosshairIcon
  const num = String(index + 1).padStart(2, '0')
  return (
    <div className="wf-card">
      <div className="wf-card-head">
        <span className="wf-card-icon">
          <Icon width={18} height={18} />
        </span>
        <span className="wf-card-label">{step.cardLabel}</span>
        <span className="wf-card-num">§{num}</span>
      </div>
      <ul className="wf-card-rows">
        {step.cardItems.map((item, i) => (
          <li className="wf-card-row" key={i}>
            <span className="wf-card-row-key">{String(i + 1).padStart(2, '0')}</span>
            <span className="wf-card-row-val">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Workflow() {
  const { t } = useLang()
  const steps = t.workflow.steps
  const [active, setActive] = useState(0)
  const stepRefs = useRef<(HTMLLIElement | null)[]>([])

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = Number((entry.target as HTMLElement).dataset.index)
            if (!Number.isNaN(idx)) setActive(idx)
          }
        }
      },
      // A thin band across the viewport centre decides the active step.
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
    )
    for (const el of stepRefs.current) if (el) observer.observe(el)
    return () => observer.disconnect()
  }, [steps.length])

  return (
    <section className="workflow" id="workflow">
      <div className="container">
        <Reveal className="section-head">
          <span className="eyebrow">
            <span className="eyebrow-tick" aria-hidden />
            {t.workflow.badge}
          </span>
          <h2 className="section-title">{t.workflow.heading}</h2>
          <p className="section-sub">{t.workflow.sub}</p>
        </Reveal>

        <div className="wf-grid">
          <ol className="wf-steps">
            {steps.map((step, i) => {
              const Icon = STEP_ICONS[i] ?? CrosshairIcon
              return (
                <li
                  key={step.tag}
                  ref={(el) => { stepRefs.current[i] = el }}
                  data-index={i}
                  className={`wf-step${active === i ? ' is-active' : ''}`}
                >
                  <div className="wf-step-marker">
                    <span className="wf-step-num">{String(i + 1).padStart(2, '0')}</span>
                    <span className="wf-step-rail" aria-hidden />
                  </div>
                  <div className="wf-step-content">
                    <span className="wf-step-tag">
                      <Icon width={15} height={15} />
                      {step.tag}
                    </span>
                    <h3 className="wf-step-title">{step.title}</h3>
                    <p className="wf-step-desc">{step.desc}</p>
                    {/* Inline card for narrow screens (sticky panel is hidden there). */}
                    <div className="wf-card-inline">
                      <DossierCard step={step} index={i} />
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>

          <div className="wf-sticky" aria-hidden>
            <DossierCard step={steps[active]} index={active} />
          </div>
        </div>
      </div>
    </section>
  )
}
