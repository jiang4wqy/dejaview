import type { ElementType, ReactNode } from 'react'
import { useInView } from '../hooks/useInView'

/**
 * Wraps content in a scroll-reveal. Adds `.reveal` and, once in view, `.in`.
 * CSS handles the transition and disables it under prefers-reduced-motion.
 */
export function Reveal({
  children,
  as: Tag = 'div',
  className = '',
  delay,
}: {
  children: ReactNode
  as?: ElementType
  className?: string
  delay?: number
}) {
  const { ref, inView } = useInView<HTMLElement>()
  return (
    <Tag
      ref={ref}
      className={`reveal ${className}${inView ? ' in' : ''}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  )
}
