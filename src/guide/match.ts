import { fold } from '../iptv/channels'
import type { Channel } from '../iptv/m3u'
import type { Guide, Programme } from './xmltv'

/**
 * A name in a form that compares well: no case, no accents, no quality or
 * note in brackets, no HD or 4K mark, and only letters and digits.
 */
export function matchName(name: string): string {
  return fold(name)
    .replace(/\([^)]*\)|\[[^\]]*\]/g, ' ')
    .replace(/\b(f?hd|uhd|sd|4k|hevc|h265)\b/g, ' ')
    .replace(/[^\p{L}\p{N}]/gu, '')
}

export interface GuideIndex {
  byId: Map<string, Programme[]>
  byName: Map<string, Programme[]>
}

/** Joins the guides. When two guides have the same channel, the first guide wins. */
export function indexGuides(guides: readonly Guide[]): GuideIndex {
  const byId = new Map<string, Programme[]>()
  const byName = new Map<string, Programme[]>()
  for (const guide of guides) {
    for (const [id, list] of Object.entries(guide.programmes)) {
      const key = id.toLowerCase()
      if (!byId.has(key)) byId.set(key, list)
    }
    for (const channel of guide.channels) {
      const list = guide.programmes[channel.id]
      if (!list) continue
      for (const name of [...channel.names, channel.id]) {
        const key = matchName(name)
        if (key && !byName.has(key)) byName.set(key, list)
      }
    }
  }
  return { byId, byName }
}

/** The programmes of a channel: by its `tvg-id`, then by its `tvg-name`, then by its name. */
export function programmesOf(channel: Channel, index: GuideIndex): Programme[] | undefined {
  if (channel.tvgId) {
    const list = index.byId.get(channel.tvgId.toLowerCase())
    if (list) return list
  }
  for (const name of [channel.tvgName, channel.name]) {
    const key = name ? matchName(name) : ''
    const list = key ? index.byName.get(key) : undefined
    if (list) return list
  }
  return undefined
}
