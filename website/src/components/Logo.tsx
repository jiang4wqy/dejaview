/** The DejaView eye/"D" mark, redrawn from frontend/app/icon.svg so it stays
 * crisp at any size and shares the gold→pink→teal brand gradient. */
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="DejaView">
      <defs>
        <linearGradient id="dv-logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#ffd54a" />
          <stop offset=".52" stopColor="#ff4d8d" />
          <stop offset="1" stopColor="#5eead4" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="#09090b" />
      <path
        d="M15 14h17c12 0 20 7 20 18s-8 18-20 18H15V14Zm13 9v18h4c6 0 10-3 10-9s-4-9-10-9h-4Z"
        fill="url(#dv-logo-g)"
      />
      <circle cx="16" cy="16" r="3" fill="#fff" />
    </svg>
  )
}
