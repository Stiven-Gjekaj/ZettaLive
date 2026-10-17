import { useGuides } from '../guide/guides'
import { usePlaylists } from './playlists'
import { sortLines } from './sourceList'

/** What happened to the lines of a pasted list. */
export interface AddSummary {
  playlists: number
  guides: number
  existing: number
  addons: number
  cleartext: number
  notUrl: number
}

/** Adds each playlist and each guide of a pasted list. A URL that the app has already stays once. */
export async function addPastedList(text: string): Promise<AddSummary> {
  const summary: AddSummary = { playlists: 0, guides: 0, existing: 0, addons: 0, cleartext: 0, notUrl: 0 }
  const known = new Set([...usePlaylists.getState().sources.flatMap((s) => (s.url ? [s.url] : [])), ...useGuides.getState().sources.map((s) => s.url)])
  const work: Promise<void>[] = []
  for (const { url, kind } of sortLines(text)) {
    if (kind === 'addon') summary.addons++
    else if (kind === 'cleartext') summary.cleartext++
    else if (kind === 'not-url') summary.notUrl++
    else if (known.has(url)) summary.existing++
    else if (kind === 'guide') {
      summary.guides++
      work.push(useGuides.getState().addUrl(url))
    } else {
      summary.playlists++
      work.push(usePlaylists.getState().addUrl(url))
    }
  }
  await Promise.all(work)
  return summary
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** The summary as sentences for the user. */
export function summaryText(s: AddSummary): string[] {
  const lines: string[] = []
  if (s.playlists || s.guides) lines.push(`Added ${plural(s.playlists, 'playlist', 'playlists')} and ${plural(s.guides, 'guide', 'guides')}.`)
  if (s.existing) lines.push(`Skipped ${plural(s.existing, 'line that is', 'lines that are')} in your list already.`)
  if (s.addons) lines.push(`Skipped ${plural(s.addons, 'Stremio addon', 'Stremio addons')}. ZettaLive plays IPTV playlists only.`)
  if (s.cleartext) lines.push(`Skipped ${plural(s.cleartext, 'http:// URL', 'http:// URLs')}. A browser cannot load them from an HTTPS page.`)
  if (s.notUrl) lines.push(`Skipped ${plural(s.notUrl, 'line that is not a URL', 'lines that are not URLs')}.`)
  if (lines.length === 0) lines.push('The list has no URLs.')
  return lines
}
