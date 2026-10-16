import type { Channel } from '../iptv/m3u'

/** True when the channel can play this past programme again. */
export function canCatchUp(channel: Channel, start: number, stop: number, now: number): boolean {
  if (!channel.catchup || stop > now) return false
  const days = channel.catchupDays ?? 1
  return now - start <= days * 86_400_000
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Writes a time with the tokens Y, m, d, H, M, and S, in UTC. */
export function formatTime(ms: number, format: string): string {
  const d = new Date(ms)
  const parts: Record<string, string> = {
    Y: String(d.getUTCFullYear()),
    m: pad(d.getUTCMonth() + 1),
    d: pad(d.getUTCDate()),
    H: pad(d.getUTCHours()),
    M: pad(d.getUTCMinutes()),
    S: pad(d.getUTCSeconds()),
  }
  return format.replace(/[YmdHMS]/g, (t) => parts[t] ?? t)
}

/** Puts the times of the programme into the place holders of a catch-up URL. */
export function fillCatchup(template: string, start: number, stop: number, now: number): string {
  const seconds = (ms: number) => String(Math.floor(ms / 1000))
  const values: Record<string, number> = { utc: start, start, timestamp: now, lutc: now, now, end: stop, utcend: stop }
  return template
    .replace(/\$?\{(utc|start|end|utcend|lutc|now|timestamp):([^}]+)\}/g, (_, key: string, format: string) => formatTime(values[key] ?? start, format))
    .replace(/\$?\{(utc|start|end|utcend|lutc|now|timestamp)\}/g, (_, key: string) => seconds(values[key] ?? start))
    .replace(/\$?\{duration\}/g, String(Math.round((stop - start) / 1000)))
    .replace(/\$?\{offset\}/g, String(Math.round((now - start) / 1000)))
    .replace(/\$?\{(Y|m|d|H|M|S)\}/g, (_, token: string) => formatTime(start, token))
}

/** The URL that plays a past programme, from the catch-up attributes of the channel. */
export function catchupUrl(channel: Channel, start: number, stop: number, now: number): string | undefined {
  const kind = channel.catchup?.toLowerCase()
  const source = channel.catchupSource
  const live = channel.url
  if (!kind) return undefined
  if (kind === 'append') return source ? live + fillCatchup(source, start, stop, now) : undefined
  if (kind === 'shift' || kind === 'timeshift') {
    const join = live.includes('?') ? '&' : '?'
    return `${live}${join}utc=${Math.floor(start / 1000)}&lutc=${Math.floor(now / 1000)}`
  }
  if (kind === 'flussonic' || kind === 'flussonic-hls' || kind === 'fs' || kind === 'flussonic-ts') {
    const from = Math.floor(start / 1000)
    const duration = Math.round((stop - start) / 1000)
    const hls = live.replace(/\/(index|video|mono)(?:\.m3u8|-[^/?]*\.m3u8)(\?|$)/, `/$1-${from}-${duration}.m3u8$2`)
    if (hls !== live) return hls
    const ts = live.replace(/\/mpegts(\?|$)/, `/timeshift_abs-${from}.ts$1`)
    return ts !== live ? ts : undefined
  }
  if (kind === 'xc') {
    const match = /^(https?:\/\/[^/]+)\/(?:live\/)?([^/]+)\/([^/]+)\/(\d+)(?:\.(\w+))?/.exec(live)
    if (!match) return undefined
    const [, host, user, pass, id, ext] = match
    const minutes = Math.round((stop - start) / 60_000)
    return `${host}/timeshift/${user}/${pass}/${minutes}/${formatTime(start, 'Y-m-d:H-M')}/${id}.${ext ?? 'ts'}`
  }
  return source ? fillCatchup(source, start, stop, now) : undefined
}
