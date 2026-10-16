import { hash } from './hash'

/** One channel of a playlist. */
export interface Channel {
  /** A stable key: the same channel keeps it when the playlist loads again. */
  id: string
  playlistId: string
  name: string
  url: string
  tvgId?: string
  tvgName?: string
  logo?: string
  group?: string
  number?: number
  userAgent?: string
  referrer?: string
  catchup?: string
  catchupSource?: string
  catchupDays?: number
}

export interface Playlist {
  /** The guide URLs from the `url-tvg` or `x-tvg-url` attribute of the header. */
  guideUrls: string[]
  channels: Channel[]
}

const ATTRIBUTE = /([\w-]+)="([^"]*)"/g

function attributes(text: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const match of text.matchAll(ATTRIBUTE)) {
    const key = match[1]
    if (key) result[key.toLowerCase()] = match[2] ?? ''
  }
  return result
}

/** The text after the comma that ends the attributes. A comma inside quotes does not count. */
function titleOf(line: string): string {
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') quoted = !quoted
    else if (c === ',' && !quoted) return line.slice(i + 1).trim()
  }
  return ''
}

function number(text: string | undefined): number | undefined {
  if (!text) return undefined
  const n = Number.parseInt(text, 10)
  return Number.isFinite(n) ? n : undefined
}

function optional(text: string | undefined): string | undefined {
  const t = text?.trim()
  return t ? t : undefined
}

/** True when the text looks like an M3U playlist. */
export function isM3u(text: string): boolean {
  const head = text.replace(/^\uFEFF/, '').trimStart()
  return head.startsWith('#EXTM3U') || head.includes('#EXTINF')
}

/** Reads an M3U playlist. A line that is not a channel is ignored. */
export function parseM3u(text: string, playlistId: string): Playlist {
  const guideUrls: string[] = []
  const channels: Channel[] = []
  const seen = new Map<string, number>()
  let info: Record<string, string> | undefined
  let title = ''
  let group: string | undefined
  let userAgent: string | undefined
  let referrer: string | undefined

  for (const raw of text.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    if (line.startsWith('#EXTM3U')) {
      const head = attributes(line)
      for (const key of ['url-tvg', 'x-tvg-url']) {
        for (const url of (head[key] ?? '').split(',')) {
          const u = url.trim()
          if (u && !guideUrls.includes(u)) guideUrls.push(u)
        }
      }
    } else if (line.startsWith('#EXTINF')) {
      info = attributes(line.slice(0, line.length - titleOf(line).length))
      title = titleOf(line)
      group = undefined
      userAgent = undefined
      referrer = undefined
    } else if (line.startsWith('#EXTGRP:')) {
      group = optional(line.slice('#EXTGRP:'.length))
    } else if (line.startsWith('#EXTVLCOPT:')) {
      const [key, ...rest] = line.slice('#EXTVLCOPT:'.length).split('=')
      const value = optional(rest.join('='))
      if (key === 'http-user-agent') userAgent = value
      if (key === 'http-referrer' || key === 'http-referer') referrer = value
    } else if (!line.startsWith('#') && info) {
      const name = title || info['tvg-name'] || line
      const base = hash(`${line}|${name}`)
      const count = seen.get(base) ?? 0
      seen.set(base, count + 1)
      channels.push({
        id: `${playlistId}:${count ? `${base}-${count}` : base}`,
        playlistId,
        name,
        url: line,
        tvgId: optional(info['tvg-id']),
        tvgName: optional(info['tvg-name']),
        logo: optional(info['tvg-logo']),
        group: optional(info['group-title']) ?? group,
        number: number(info['tvg-chno'] ?? info['channel-number']),
        userAgent: userAgent ?? optional(info['user-agent']),
        referrer,
        catchup: optional(info['catchup']),
        catchupSource: optional(info['catchup-source']),
        catchupDays: number(info['catchup-days']),
      })
      info = undefined
    }
  }
  return { guideUrls, channels }
}
