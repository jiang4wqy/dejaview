import { useEffect, useRef, useState } from 'react'

/**
 * Reveal-on-scroll. Returns a ref and whether it has entered the viewport.
 * Fires once and then disconnects. When IntersectionObserver is unavailable
 * (older browsers), it resolves to `true` immediately so content is never hidden.
 */
export function useInView<T extends Element = HTMLDivElement>(
  // threshold 0 + a bottom margin fires as soon as the element's top scrolls
  // into the lower viewport — robust even for elements taller than the screen,
  // where a fractional threshold could never be reached.
  options: IntersectionObserverInit = { threshold: 0, rootMargin: '0px 0px -12% 0px' },
): { ref: React.RefObject<T>; inView: boolean } {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
          break
        }
      }
    }, options)
    observer.observe(el)
    return () => observer.disconnect()
    // options is a stable literal per call site; intentionally not a dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { ref, inView }
}
