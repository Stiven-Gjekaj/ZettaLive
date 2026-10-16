import { create } from 'zustand'

/** A past programme that plays again from its start. */
export interface CatchupPlay {
  url: string
  title: string
}

/** The channel that plays, and the list that next and previous move in. */
interface PlayerState {
  channelId: string | null
  order: string[]
  catchup?: CatchupPlay
  open: (channelId: string, order: string[], catchup?: CatchupPlay) => void
  go: (channelId: string) => void
  close: () => void
}

export const usePlayer = create<PlayerState>((set) => ({
  channelId: null,
  order: [],
  open: (channelId, order, catchup) => set({ channelId, order, catchup }),
  go: (channelId) => set({ channelId, catchup: undefined }),
  close: () => set({ channelId: null, catchup: undefined }),
}))
