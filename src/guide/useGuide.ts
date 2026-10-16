import { useEffect, useMemo, useState } from 'react'
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

/** The programmes of each channel, by channel key. */
export function useChannelProgrammes(): Map<string, Programme[]> {
  const urls = useGuideUrls()
  const results = useGuides((s) => s.results)
  const channels = useChannels()
  return useMemo(() => {
    const guides = urls.flatMap((url) => {
      const guide = results[url]?.guide
      return guide ? [guide] : ([] as Guide[])
    })
    const index = indexGuides(guides)
    const map = new Map<string, Programme[]>()
    if (guides.length === 0) return map
    for (const channel of channels) {
      const list = programmesOf(channel, index)
      if (list) map.set(channel.id, list)
    }
    return map
  }, [urls, results, channels])
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
