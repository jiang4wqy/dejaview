import { useLang } from '../lib/lang'
import { Logo } from './Logo'

export function Footer() {
  const { t } = useLang()
  const f = t.footer
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <a className="brand" href="#top" aria-label="DejaView">
            <Logo size={26} />
            <span className="brand-name">
              Deja<span className="brand-accent">View</span>
            </span>
          </a>
          <p className="footer-tagline">{f.tagline}</p>
        </div>

        <nav className="footer-links" aria-label="footer">
          {f.links.map((l) => (
            <a key={l.label} href={l.href} target="_blank" rel="noreferrer">
              {l.label}
            </a>
          ))}
        </nav>

        <p className="footer-disclaimer">{f.disclaimer}</p>
        <p className="footer-license">{f.license}</p>
      </div>
    </footer>
  )
}
