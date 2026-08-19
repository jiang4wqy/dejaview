import { useEffect, useState } from 'react'
import { useLang } from '../lib/lang'
import { GITHUB_URL } from '../content/copy'
import { Logo } from './Logo'
import { GithubIcon, StarIcon } from './icons'

export function Header() {
  const { t, lang, toggle } = useLang()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`site-header${scrolled ? ' is-scrolled' : ''}`}>
      <div className="container header-inner">
        <a className="brand" href="#top" aria-label="DejaView">
          <Logo size={30} />
          <span className="brand-name">
            Deja<span className="brand-accent">View</span>
          </span>
          <span className="brand-tag">项目照妖镜</span>
        </a>

        <nav className="header-nav" aria-label={lang === 'zh' ? '主导航' : 'Primary'}>
          <a href="#workflow">{t.nav.workflow}</a>
          <a href="#verdict">{t.nav.verdict}</a>
          <a href="#personas">{t.nav.personas}</a>
        </nav>

        <div className="header-actions">
          <button
            type="button"
            className="lang-toggle"
            onClick={toggle}
            aria-label={t.nav.langToggleLabel}
            title={t.nav.langToggleLabel}
          >
            <span className="lang-current">{lang === 'zh' ? '中' : 'EN'}</span>
            <span className="lang-sep" aria-hidden>/</span>
            <span className="lang-next">{t.nav.langToggleTo}</span>
          </button>
          <a className="btn btn-ghost header-github" href={GITHUB_URL} target="_blank" rel="noreferrer">
            <GithubIcon width={18} height={18} />
            <span className="header-github-label">{t.nav.github}</span>
          </a>
          <a className="btn btn-primary header-star" href={GITHUB_URL} target="_blank" rel="noreferrer">
            <StarIcon width={16} height={16} />
            <span>Star</span>
          </a>
        </div>
      </div>
    </header>
  )
}
