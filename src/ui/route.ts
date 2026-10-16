import { create } from 'zustand'

/** The screens that the icon bar and the tab bar open. */
export type Screen = 'live' | 'guide' | 'playlists' | 'settings'

export const SCREENS: { id: Screen; label: string }[] = [
  { id: 'live', label: 'Live TV' },
  { id: 'guide', label: 'Guide' },
  { id: 'playlists', label: 'Playlists' },
  { id: 'settings', label: 'Settings' },
]

interface Navigation {
  screen: Screen
  open: (screen: Screen) => void
}

export const useNavigation = create<Navigation>((set) => ({
  screen: 'live',
  open: (screen) => set({ screen }),
}))
