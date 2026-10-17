import { isBlockedCleartext } from './fetchText'

/** What the app does with one pasted line. */
export type LineKind = 'playlist' | 'guide' | 'addon' | 'cleartext' | 'not-url'

export interface SortedLine {
  url: string
  kind: LineKind
}

/** Finds the kind of one URL from its shape. */
export function lineKind(url: string, pageProtocol = globalThis.location?.protocol): LineKind {
  if (!/^https?:\/\/\S+$/i.test(url)) return 'not-url'
  if (isBlockedCleartext(url, pageProtocol)) return 'cleartext'
  const path = url.toLowerCase().split(/[?#]/)[0] ?? ''
  if (path.endsWith('/manifest.json')) return 'addon'
  if (/\.xml(\.gz)?$/.test(path) || /\/(xmltv|epg)(\.php)?$/.test(path) || path.endsWith('/xmltv.php')) return 'guide'
  return 'playlist'
}

/**
 * Sorts a pasted block: one URL on each line. A line that starts with # is a
 * note, and an empty line does nothing. Each URL shows once.
 */
export function sortLines(text: string, pageProtocol = globalThis.location?.protocol): SortedLine[] {
  const seen = new Set<string>()
  const result: SortedLine[] = []
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#') || seen.has(line)) continue
    seen.add(line)
    result.push({ url: line, kind: lineKind(line, pageProtocol) })
  }
  return result
}
