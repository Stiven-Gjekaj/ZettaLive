import { create } from 'zustand'
import { get, set } from 'idb-keyval'

/** The settings of one profile. */
export interface SettingsData {
  /** Hide the channels that cannot play in a browser. */
  hideBlocked: boolean
  /** The screen that opens at the start. */
  startScreen: 'live' | 'guide'
}

export const DEFAULT_SETTINGS: SettingsData = { hideBlocked: false, startScreen: 'live' }

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
      setState({ ...DEFAULT_SETTINGS, ...data, profileId })
    },
    change(change) {
      setState(change)
      const { profileId, hideBlocked, startScreen } = getState()
      void set(settingsKey(profileId), { hideBlocked, startScreen } satisfies SettingsData)
    },
  }))
}

export const useSettings = createSettings()
