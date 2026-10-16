import type { Screen } from './route'

const PATHS: Record<Screen, string> = {
  live: 'M4 7h16v11H4z M9 3l3 4 3-4',
  guide: 'M4 5h16v14H4z M4 10h16 M10 5v14',
  playlists: 'M4 6h12 M4 11h12 M4 16h8 M18 14v6 M15 17h6',
  settings:
    'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z M12 2v3 M12 19v3 M2 12h3 M19 12h3 M4.9 4.9l2.1 2.1 M17 17l2.1 2.1 M4.9 19.1L7 17 M17 7l2.1-2.1',
}

/** A line icon for a screen. */
export function Icon({ screen }: { screen: Screen }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={PATHS[screen]} />
    </svg>
  )
}
