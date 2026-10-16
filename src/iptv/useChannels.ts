import { useMemo } from 'react'
import { numberChannels, type NumberedChannel } from './channels'
import { allChannels, usePlaylists } from './playlists'

/** All channels of all playlists, with their numbers. */
export function useChannels(): NumberedChannel[] {
  const sources = usePlaylists((s) => s.sources)
  const results = usePlaylists((s) => s.results)
  return useMemo(() => numberChannels(allChannels({ sources, results })), [sources, results])
}
