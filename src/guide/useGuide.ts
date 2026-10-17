import { useEffect, useMemo, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import type { NumberedChannel } from '../iptv/channels'
import { usePlaylists } from '../iptv/playlists'
import { useChannels } from '../iptv/useChannels'
import { useGuides } from './guides'
import { indexGuides, programmesOf } from './match'
import type { Guide, Programme } from './xmltv'

/** The guide URLs of the playlists, then the guide URLs of the user. */
export function useGuideUrls(): string[] {
  const sources = usePlaylists((s) => s.sources)
  const results = usePlaylists((s) => s.results)
  const own = useGuides((s) => s.sources)
  return useMemo(
    () => [...new Set([...sources.flatMap((s) => results[s.id]?.guideUrls ?? []), ...own.map((s) => s.url)])],
    [sources, results, own],
  )
}

/** Loads each guide URL that is new. */
export function useGuideSync(): void {
  const urls = useGuideUrls()
  useEffect(() => {
    void useGuides.getState().sync(urls)
  }, [urls])
}

/** The last match, which all screens share. */
let last: { guides: readonly Guide[]; channels: readonly NumberedChannel[]; map: Map<string, Programme[]> } | undefined

const sameList = <T,>(a: readonly T[], b: readonly T[]) => a.length === b.length && a.every((x, i) => x === b[i])

/**
 * Finds the programmes of each channel. The match runs again only when a
 * guide or the channels change, not when a guide only starts or fails to
 * load. All screens share the last match.
 */
export function matchChannels(guides: readonly Guide[], channels: readonly NumberedChannel[]): Map<string, Programme[]> {
  if (last && last.channels === channels && sameList(last.guides, guides)) return last.map
  const map = new Map<string, Programme[]>()
  if (guides.length > 0) {
    const index = indexGuides(guides)
    for (const channel of channels) {
      const list = programmesOf(channel, index)
      if (list) map.set(channel.id, list)
    }
  }
  last = { guides, channels, map }
  return map
}

/** The programmes of each channel, by channel key. */
export function useChannelProgrammes(): Map<string, Programme[]> {
  const urls = useGuideUrls()
  // Only the loaded guides. A change of a loading or a failed guide gives the same list.
  const guides = useGuides(useShallow((s) => urls.flatMap((url) => s.results[url]?.guide ?? [])))
  const channels = useChannels()
  return useMemo(() => matchChannels(guides, channels), [guides, channels])
}

/** The time now. It changes each interval, so that now and next stay true. */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}

/** A time such as 14:30, in the format of the user. */
export function clock(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}
