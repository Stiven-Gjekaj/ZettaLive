/** One programme of a guide. Times are in milliseconds since 1970. */
export interface Programme {
  start: number
  stop: number
  title: string
  subTitle?: string
  description?: string
  category?: string
}

/** One channel of a guide. */
export interface GuideChannel {
  id: string
  names: string[]
  icon?: string
}

export interface Guide {
  channels: GuideChannel[]
  /** The programmes of each guide channel ID, sorted by start time. */
  programmes: Record<string, Programme[]>
}

export interface ReadOptions {
  /** Keep only the programmes that end after this time. */
  from?: number
  /** Keep only the programmes that start before this time. */
  to?: number
  /** Keep only these guide channel IDs. */
  keep?: (id: string) => boolean
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }

/** Changes the XML entities of a text back to characters. */
export function unescapeXml(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (whole, code: string) => {
    if (code[0] === '#') {
      const n = code[1] === 'x' || code[1] === 'X' ? Number.parseInt(code.slice(2), 16) : Number.parseInt(code.slice(1), 10)
      return Number.isFinite(n) ? String.fromCodePoint(n) : whole
    }
    return ENTITIES[code.toLowerCase()] ?? whole
  })
}

function attribute(tag: string, name: string): string | undefined {
  const match = new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i').exec(tag)
  const value = match?.[2] ?? match?.[3]
  return value === undefined ? undefined : unescapeXml(value)
}

function element(body: string, name: string): string | undefined {
  const match = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i').exec(body)
  if (!match?.[1]) return undefined
  const text = unescapeXml(match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')).trim()
  return text || undefined
}

function elements(body: string, name: string): string[] {
  const result: string[] = []
  for (const match of body.matchAll(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'gi'))) {
    const text = unescapeXml(match[1] ?? '').trim()
    if (text) result.push(text)
  }
  return result
}

/** Reads an XMLTV time such as `20261017120000 +0100`. A time with no zone is UTC. */
export function parseXmltvTime(text: string | undefined): number | undefined {
  const match = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?\s*([+-])?(\d{2})?(\d{2})?/.exec(text?.trim() ?? '')
  if (!match) return undefined
  const [, y, mo, d, h, mi, s, sign, zh, zm] = match
  const utc = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s ?? 0))
  const offset = sign ? (sign === '-' ? -1 : 1) * (Number(zh ?? 0) * 60 + Number(zm ?? 0)) * 60_000 : 0
  return utc - offset
}

/**
 * Reads an XMLTV guide. A guide can be very large, so the reader does not
 * build a DOM, and it keeps only the programmes that the options ask for.
 */
export function parseXmltv(text: string, options: ReadOptions = {}): Guide {
  const from = options.from ?? -Infinity
  const to = options.to ?? Infinity
  const keep = options.keep ?? (() => true)
  const channels: GuideChannel[] = []
  const programmes: Record<string, Programme[]> = {}

  for (const match of text.matchAll(/<channel(\s[^>]*)>([\s\S]*?)<\/channel>/gi)) {
    const id = attribute(match[1] ?? '', 'id')
    if (!id) continue
    const body = match[2] ?? ''
    const icon = /<icon\s[^>]*>/i.exec(body)?.[0]
    channels.push({ id, names: elements(body, 'display-name'), icon: icon ? attribute(icon, 'src') : undefined })
  }

  for (const match of text.matchAll(/<programme(\s[^>]*)>([\s\S]*?)<\/programme>/gi)) {
    const tag = match[1] ?? ''
    const id = attribute(tag, 'channel')
    if (!id || !keep(id)) continue
    const start = parseXmltvTime(attribute(tag, 'start'))
    if (start === undefined || start >= to) continue
    const stop = parseXmltvTime(attribute(tag, 'stop')) ?? start + 30 * 60_000
    if (stop <= from || stop <= start) continue
    const body = match[2] ?? ''
    const programme: Programme = { start, stop, title: element(body, 'title') ?? 'No title' }
    const subTitle = element(body, 'sub-title')
    const description = element(body, 'desc')
    const category = element(body, 'category')
    if (subTitle) programme.subTitle = subTitle
    if (description) programme.description = description
    if (category) programme.category = category
    ;(programmes[id] ??= []).push(programme)
  }

  for (const list of Object.values(programmes)) list.sort((a, b) => a.start - b.start)
  return { channels, programmes }
}

/** The programme that is on at a time, and the one after it. */
export function nowAndNext(list: readonly Programme[] | undefined, time: number): { now?: Programme; next?: Programme } {
  if (!list?.length) return {}
  const index = list.findIndex((p) => p.stop > time)
  if (index === -1) return {}
  const first = list[index]
  if (first && first.start <= time) return { now: first, next: list[index + 1] }
  return { next: first }
}
