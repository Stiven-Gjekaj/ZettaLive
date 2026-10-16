import { create } from 'zustand'
import { del, get, set } from 'idb-keyval'
import { libraryKey, useLibrary } from './library'
import { settingsKey, useSettings } from './settings'

/** One person who uses the app on this device. */
export interface Profile {
  id: string
  name: string
  /** The number of the picture. */
  avatar: number
}

export const PROFILES_KEY = 'profiles'
export const ACTIVE_KEY = 'active-profile'
export const DEFAULT_PROFILE: Profile = { id: 'default', name: 'Me', avatar: 0 }

interface Profiles {
  profiles: Profile[]
  activeId: string
  /** False until the user chooses a profile, when there is more than one. */
  picked: boolean
  start: () => Promise<void>
  choose: (id: string) => Promise<void>
  add: (name: string, avatar: number) => Promise<Profile>
  edit: (id: string, change: Partial<Omit<Profile, 'id'>>) => Promise<void>
  remove: (id: string) => Promise<void>
}

/** Loads the favourites and the settings of a profile. */
async function loadProfileData(id: string) {
  await Promise.all([useLibrary.getState().load(id), useSettings.getState().load(id)])
}

export function createProfiles() {
  return create<Profiles>((setState, getState) => {
    const save = (profiles: Profile[]) => set(PROFILES_KEY, profiles)
    return {
      profiles: [DEFAULT_PROFILE],
      activeId: DEFAULT_PROFILE.id,
      picked: false,

      async start() {
        const profiles = (await get<Profile[]>(PROFILES_KEY)) ?? [DEFAULT_PROFILE]
        const saved = await get<string>(ACTIVE_KEY)
        const activeId = profiles.some((p) => p.id === saved) ? (saved as string) : (profiles[0]?.id ?? DEFAULT_PROFILE.id)
        setState({ profiles, activeId, picked: profiles.length <= 1 })
        await loadProfileData(activeId)
      },

      async choose(id) {
        if (!getState().profiles.some((p) => p.id === id)) return
        setState({ activeId: id, picked: true })
        await set(ACTIVE_KEY, id)
        await loadProfileData(id)
      },

      async add(name, avatar) {
        const profile: Profile = { id: crypto.randomUUID(), name: name.trim() || 'Profile', avatar }
        const profiles = [...getState().profiles, profile]
        setState({ profiles })
        await save(profiles)
        return profile
      },

      async edit(id, change) {
        const profiles = getState().profiles.map((p) => (p.id === id ? { ...p, ...change, name: change.name?.trim() || p.name } : p))
        setState({ profiles })
        await save(profiles)
      },

      async remove(id) {
        const profiles = getState().profiles.filter((p) => p.id !== id)
        if (profiles.length === 0) return
        setState({ profiles })
        await save(profiles)
        await Promise.all([del(libraryKey(id)), del(settingsKey(id))])
        if (getState().activeId === id) await getState().choose(profiles[0]!.id)
      },
    }
  })
}

export const useProfiles = createProfiles()
