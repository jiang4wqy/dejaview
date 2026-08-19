import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { COPY, type Copy, type Lang } from '../content/copy'

const STORAGE_KEY = 'dejaview.lang'

interface LanguageContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  toggle: () => void
  /** The active copy bundle for the current language. */
  t: Copy
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

/** Read the persisted language, falling back to Chinese (the default audience). */
function readInitialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'zh' || saved === 'en') return saved
  } catch {
    // localStorage can throw in private mode / sandboxed frames — ignore and default.
  }
  return 'zh'
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readInitialLang)

  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Persisting is best-effort; the session still switches without it.
    }
  }, [])

  const toggle = useCallback(() => {
    setLangState(prev => {
      const next = prev === 'zh' ? 'en' : 'zh'
      try {
        localStorage.setItem(STORAGE_KEY, next)
      } catch {
        // ignore
      }
      return next
    })
  }, [])

  // Keep the document language in sync for a11y and correct CJK/Latin rendering.
  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en'
  }, [lang])

  const value = useMemo<LanguageContextValue>(
    () => ({ lang, setLang, toggle, t: COPY[lang] }),
    [lang, setLang, toggle],
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLang(): LanguageContextValue {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLang must be used within a LanguageProvider')
  return ctx
}
