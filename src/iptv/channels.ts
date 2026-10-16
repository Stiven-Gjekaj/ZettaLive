import type { Channel } from './m3u'

/** A channel with the number that the app shows and uses to go to it. */
export interface NumberedChannel extends Channel {
  shown: number
}

/** The filter of the channel list. */
export type ChannelFilter = { kind: 'all' } | { kind: 'favourites' } | { kind: 'hidden' } | { kind: 'group'; group: string }

export interface ListOptions {
  filter: ChannelFilter
  query: string
  favourites: readonly string[]
  hiddenGroups: readonly string[]
  hiddenChannels: readonly string[]
}

export const NO_GROUP = 'Other'

/**
 * Gives each channel a number. A channel keeps the number of its `tvg-chno`
 * attribute. A channel with no number gets the next number that no channel
 * uses, in the order of the playlists.
 */
export function numberChannels(channels: readonly Channel[]): NumberedChannel[] {
  const used = new Set(channels.flatMap((c) => (c.number !== undefined ? [c.number] : [])))
  let next = 1
  return channels.map((c) => {
    if (c.number !== undefined) return { ...c, shown: c.number }
    while (used.has(next)) next++
    used.add(next)
    return { ...c, shown: next }
  })
}

export function groupOf(channel: Channel): string {
  return channel.group ?? NO_GROUP
}

/** The groups, in the order of their first channel. */
export function groupsOf(channels: readonly Channel[]): string[] {
  return [...new Set(channels.map(groupOf))]
}

/** Lower case, with no accents, so that "Cafe" finds "Café". */
export function fold(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

/** True when the channel is hidden, by itself or by its group. */
export function isHidden(channel: Channel, hiddenGroups: readonly string[], hiddenChannels: readonly string[]): boolean {
  return hiddenChannels.includes(channel.id) || hiddenGroups.includes(groupOf(channel))
}

/** The channels that the list shows for a filter and a search text. */
export function listChannels<T extends NumberedChannel>(channels: readonly T[], options: ListOptions): T[] {
  const { filter, favourites, hiddenGroups, hiddenChannels } = options
  const query = fold(options.query.trim())
  const favouriteSet = new Set(favourites)
  return channels.filter((c) => {
    const hidden = isHidden(c, hiddenGroups, hiddenChannels)
    if (filter.kind === 'hidden' ? !hidden : hidden) return false
    if (filter.kind === 'favourites' && !favouriteSet.has(c.id)) return false
    if (filter.kind === 'group' && groupOf(c) !== filter.group) return false
    if (!query) return true
    return fold(c.name).includes(query) || String(c.shown) === query
  })
}

/** The first channel with this number. */
export function channelByNumber<T extends NumberedChannel>(channels: readonly T[], shown: number): T | undefined {
  return channels.find((c) => c.shown === shown)
}
