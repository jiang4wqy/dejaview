import { useLang } from '../lib/lang'
import { Reveal } from './Reveal'

export function Problem() {
  const { t } = useLang()
  return (
    <section className="problem" id="problem">
      <div className="container">
        <Reveal className="problem-inner">
          <span className="eyebrow eyebrow-center">
            <span className="eyebrow-tick" aria-hidden />
            {t.problem.badge}
          </span>
          <blockquote className="problem-quote">{t.problem.quote}</blockquote>
          <div className="problem-body">
            {t.problem.body.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <p className="problem-origin">{t.problem.nameOrigin}</p>
        </Reveal>
      </div>
    </section>
  )
}
