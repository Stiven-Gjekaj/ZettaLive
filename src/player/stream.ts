import type { Channel } from '../iptv/m3u'

/** How the player reads a stream. */
export type StreamKind = 'hls' | 'mpegts' | 'file'

/** Why a browser cannot play a channel. */
export type BlockReason = 'cleartext' | 'header' | 'network' | 'format'

export const BLOCK_TEXT: Record<BlockReason, string> = {
  cleartext: 'The stream uses http://. A browser cannot play it from an HTTPS page.',
  header: 'The stream needs a special header (a user agent or a referrer). A browser cannot send it.',
  network: 'The server did not answer, or it does not let a browser read the stream (no CORS headers).',
  format: 'This browser cannot play the format of this stream.',
}

function path(url: string): string {
  try {
    return new URL(url).pathname.toLowerCase()
  } catch {
    return url.toLowerCase().split(/[?#]/)[0] ?? ''
  }
}

/** Finds the kind of a stream from its URL. When the URL does not tell, it is HLS first. */
export function streamKind(url: string): StreamKind {
  const p = path(url)
  if (/\.m3u8?$/.test(p) || url.toLowerCase().includes('.m3u8')) return 'hls'
  if (/\.(ts|mts|mpegts)$/.test(p)) return 'mpegts'
  if (/\.(mp4|m4v|webm|mov|mp3|aac|ogg)$/.test(p)) return 'file'
  return 'hls'
}

/** The reason that is known before the player starts, or undefined. */
export function knownBlock(channel: Channel, pageProtocol = globalThis.location?.protocol): BlockReason | undefined {
  if (pageProtocol === 'https:' && channel.url.trim().toLowerCase().startsWith('http:')) return 'cleartext'
  if (channel.referrer || channel.userAgent) return 'header'
  return undefined
}
