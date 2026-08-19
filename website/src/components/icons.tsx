/** Inline SVG icons — no emoji as functional icons, no icon-font dependency. */
import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const base = (props: IconProps): IconProps => ({
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
  ...props,
})

export function StarIcon(props: IconProps) {
  return (
    <svg {...base(props)} fill="currentColor" stroke="none">
      <path d="M12 2.5l2.9 5.88 6.49.94-4.7 4.58 1.11 6.46L12 17.9l-5.8 3.05 1.1-6.46-4.69-4.58 6.49-.94L12 2.5z" />
    </svg>
  )
}

export function ArrowDownIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 5v14M6 13l6 6 6-6" />
    </svg>
  )
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

export function GithubIcon(props: IconProps) {
  return (
    <svg {...base(props)} fill="currentColor" stroke="none">
      <path d="M12 1.8a10.2 10.2 0 00-3.22 19.88c.5.1.68-.22.68-.48v-1.7c-2.83.62-3.43-1.36-3.43-1.36-.46-1.18-1.13-1.5-1.13-1.5-.93-.63.07-.62.07-.62 1.02.07 1.56 1.05 1.56 1.05.9 1.56 2.37 1.1 2.95.84.09-.66.36-1.1.64-1.36-2.26-.26-4.64-1.13-4.64-5.03 0-1.11.4-2.02 1.05-2.73-.11-.26-.46-1.3.1-2.7 0 0 .85-.28 2.8 1.04a9.6 9.6 0 015.1 0c1.94-1.32 2.8-1.04 2.8-1.04.55 1.4.2 2.44.1 2.7.65.71 1.04 1.62 1.04 2.73 0 3.91-2.38 4.77-4.65 5.02.37.32.7.94.7 1.9v2.82c0 .27.18.59.69.48A10.2 10.2 0 0012 1.8z" />
    </svg>
  )
}

export function CrosshairIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="7" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function FingerprintIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 4.5a7.5 7.5 0 017.5 7.5" />
      <path d="M4.5 12A7.5 7.5 0 0112 4.5" />
      <path d="M8 12a4 4 0 018 0v1.5" />
      <path d="M12 12v3.5" />
      <path d="M15.5 13.5a3.5 3.5 0 01-.4 3" />
      <path d="M8.6 16.8A5.5 5.5 0 016.5 12" />
    </svg>
  )
}

export function ScaleIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 4v16M7 20h10" />
      <path d="M12 6l-6 2 6-2 6 2-6-2z" />
      <path d="M6 8l-2.5 5a2.5 2.5 0 005 0L6 8zM18 8l-2.5 5a2.5 2.5 0 005 0L18 8z" />
    </svg>
  )
}

export function DocIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 2.5h8l4 4V21a.5.5 0 01-.5.5h-11A.5.5 0 016 21V2.5z" />
      <path d="M14 2.5V6.5h4M9 12h6M9 15.5h6M9 8.5h2" />
    </svg>
  )
}

export function SearchIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4.3-4.3" />
    </svg>
  )
}
