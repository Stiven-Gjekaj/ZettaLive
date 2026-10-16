import { create } from 'zustand'
import { get, set } from 'idb-keyval'
import { isFilter, type VideoFilter } from '../player/filters'

/** The settings of one profile. */
export interface SettingsData {
  /** Hide the channels that cannot play in a browser. */
  hideBlocked: boolean
  /** The screen that opens at the start. */
  startScreen: 'live' | 'guide'
  /** The look of the video. */
  filter: VideoFilter
}

export const DEFAULT_SETTINGS: SettingsData = { hideBlocked: false, startScreen: 'live', filter: 'none' }

export const settingsKey = (profileId: string) => `settings:${profileId}`

interface Settings extends SettingsData {
  profileId: string
  load: (profileId: string) => Promise<void>
  change: (change: Partial<SettingsData>) => void
}

export function createSettings() {
  return create<Settings>((setState, getState) => ({
    ...DEFAULT_SETTINGS,
    profileId: 'default',
    async load(profileId) {
      const data = (await get<Partial<SettingsData>>(settingsKey(profileId))) ?? {}
      // A filter that this version does not know falls back to no filter.
      const filter = isFilter(data.filter) ? data.filter : 'none'
      setState({ ...DEFAULT_SETTINGS, ...data, filter, profileId })
    },
    change(change) {
      setState(change)
      const { profileId, hideBlocked, startScreen, filter } = getState()
      void set(settingsKey(profileId), { hideBlocked, startScreen, filter } satisfies SettingsData)
    },
  }))
}

export const useSettings = createSettings()
