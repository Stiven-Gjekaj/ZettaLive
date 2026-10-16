import { create } from 'zustand'
import type { BlockReason } from './stream'

/** The channels that did not play in this session, and why. */
interface Health {
  blocked: Record<string, BlockReason>
  mark: (channelId: string, reason: BlockReason) => void
  clear: (channelId: string) => void
}

export const useHealth = create<Health>((set) => ({
  blocked: {},
  mark: (channelId, reason) => set((s) => ({ blocked: { ...s.blocked, [channelId]: reason } })),
  clear: (channelId) =>
    set((s) => {
      const blocked = { ...s.blocked }
      delete blocked[channelId]
      return { blocked }
    }),
}))
