import { create } from 'zustand'
import { get, set } from 'idb-keyval'

/** The choices of one profile about the channels. */
export interface LibraryData {
  favourites: string[]
  hiddenGroups: string[]
  hiddenChannels: string[]
}

export const EMPTY_LIBRARY: LibraryData = { favourites: [], hiddenGroups: [], hiddenChannels: [] }

export const libraryKey = (profileId: string) => `library:${profileId}`

export interface Library extends LibraryData {
  profileId: string
  load: (profileId: string) => Promise<void>
  toggleFavourite: (channelId: string) => void
  setChannelHidden: (channelId: string, hidden: boolean) => void
  setGroupHidden: (group: string, hidden: boolean) => void
}

function toggle(list: string[], item: string, on: boolean): string[] {
  const without = list.filter((x) => x !== item)
  return on ? [...without, item] : without
}

export function createLibrary() {
  return create<Library>((setState, getState) => {
    const update = (change: Partial<LibraryData>) => {
      setState(change)
      const { profileId, favourites, hiddenGroups, hiddenChannels } = getState()
      void set(libraryKey(profileId), { favourites, hiddenGroups, hiddenChannels } satisfies LibraryData)
    }
    return {
      ...EMPTY_LIBRARY,
      profileId: 'default',
      async load(profileId) {
        const data = (await get<Partial<LibraryData>>(libraryKey(profileId))) ?? {}
        setState({ ...EMPTY_LIBRARY, ...data, profileId })
      },
      toggleFavourite(channelId) {
        const { favourites } = getState()
        update({ favourites: toggle(favourites, channelId, !favourites.includes(channelId)) })
      },
      setChannelHidden(channelId, hidden) {
        update({ hiddenChannels: toggle(getState().hiddenChannels, channelId, hidden) })
      },
      setGroupHidden(group, hidden) {
        update({ hiddenGroups: toggle(getState().hiddenGroups, group, hidden) })
      },
    }
  })
}

export const useLibrary = createLibrary()
