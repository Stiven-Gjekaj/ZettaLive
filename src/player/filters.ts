/** A look for the video, as on ZettaStream. */
export type VideoFilter = 'none' | 'crt' | 'vhs' | 'vintage' | 'mono'

export const FILTERS: { id: VideoFilter; label: string }[] = [
  { id: 'none', label: 'No filter' },
  { id: 'crt', label: 'CRT' },
  { id: 'vhs', label: 'VHS' },
  { id: 'vintage', label: 'Vintage film' },
  { id: 'mono', label: 'Black and white' },
]

export function isFilter(value: unknown): value is VideoFilter {
  return FILTERS.some((f) => f.id === value)
}
