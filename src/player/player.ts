import { create } from 'zustand'

/** The channel that plays, and the list that next and previous move in. */
interface PlayerState {
  channelId: string | null
  order: string[]
  open: (channelId: string, order: string[]) => void
  go: (channelId: string) => void
  close: () => void
}

export const usePlayer = create<PlayerState>((set) => ({
  channelId: null,
  order: [],
  open: (channelId, order) => set({ channelId, order }),
  go: (channelId) => set({ channelId }),
  close: () => set({ channelId: null }),
}))
