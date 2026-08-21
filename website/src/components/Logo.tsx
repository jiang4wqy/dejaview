/** The DejaView eye/"D" mark, redrawn from frontend/app/icon.svg so it stays
 * crisp at any size and shares the magenta→violet→cyan brand gradient. */
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="DejaView">
      <defs>
        <linearGradient id="dv-logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#FF2E97" />
          <stop offset=".48" stopColor="#B24BFF" />
          <stop offset="1" stopColor="#16E0FF" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="#0B0B1E" />
      <path
        d="M15 14h17c12 0 20 7 20 18s-8 18-20 18H15V14Zm13 9v18h4c6 0 10-3 10-9s-4-9-10-9h-4Z"
        fill="url(#dv-logo-g)"
      />
      <circle cx="16" cy="16" r="3" fill="#fff" />
    </svg>
  )
}
