/** The number of profile pictures. */
export const AVATARS = 8

/** Eight black and white pictures for the profiles. */
function Pattern({ n }: { n: number }) {
  switch (n % AVATARS) {
    case 1:
      return <circle cx="24" cy="24" r="12" fill="none" stroke="currentColor" strokeWidth="5" />
    case 2:
      return <path d="M0 12h48M0 24h48M0 36h48" stroke="currentColor" strokeWidth="5" />
    case 3:
      return <path d="M24 9l15 27H9z" fill="currentColor" />
    case 4:
      return (
        <g fill="currentColor">
          {[12, 24, 36].flatMap((x) => [12, 24, 36].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="3.5" />))}
        </g>
      )
    case 5:
      return <rect x="13" y="13" width="22" height="22" fill="currentColor" transform="rotate(45 24 24)" />
    case 6:
      return <path d="M0 48L48 0M-12 36L36-12M12 60L60 12" stroke="currentColor" strokeWidth="5" />
    case 7:
      return <path d="M24 0v48M0 24h48" stroke="currentColor" strokeWidth="6" />
    default:
      return <path d="M14 12h20v6L22 30h12v6H14v-6l12-12H14z" fill="currentColor" />
  }
}

/** The picture of a profile in a circle. */
export function Avatar({ n, size = 48, label }: { n: number; size?: number; label?: string }) {
  return (
    <svg className="avatar" viewBox="0 0 48 48" width={size} height={size} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <defs>
        <clipPath id={`avatar-clip-${n}`}>
          <circle cx="24" cy="24" r="24" />
        </clipPath>
      </defs>
      <g clipPath={`url(#avatar-clip-${n})`}>
        <rect width="48" height="48" fill="#2e2e2e" />
        <Pattern n={n} />
      </g>
    </svg>
  )
}
