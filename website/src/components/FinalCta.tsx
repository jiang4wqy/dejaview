import { useLang } from '../lib/lang'
import { GITHUB_URL } from '../content/copy'
import { Reveal } from './Reveal'
import { ArrowRightIcon, StarIcon } from './icons'

const DOCS_URL = 'https://github.com/jiang4wqy/dejaview/blob/main/docs/ARCHITECTURE.md'

export function FinalCta() {
  const { t } = useLang()
  const f = t.final
  return (
    <section className="final" id="start">
      <div className="container">
        <Reveal className="final-inner">
          <span className="eyebrow eyebrow-center">
            <span className="eyebrow-tick" aria-hidden />
            {f.badge}
          </span>
          <h2 className="final-title">{f.heading}</h2>
          <p className="final-sub">{f.sub}</p>

          <ul className="final-facts">
            {f.facts.map((fact) => (
              <li className="final-fact" key={fact.title}>
                <span className="final-fact-title">{fact.title}</span>
                <span className="final-fact-desc">{fact.desc}</span>
              </li>
            ))}
          </ul>

          <div className="final-ctas">
            <a className="btn btn-primary btn-lg" href={GITHUB_URL} target="_blank" rel="noreferrer">
              <StarIcon width={18} height={18} />
              {f.primaryCta}
            </a>
            <a className="btn btn-ghost btn-lg" href={DOCS_URL} target="_blank" rel="noreferrer">
              {f.secondaryCta}
              <ArrowRightIcon width={18} height={18} />
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
