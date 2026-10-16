import { clear, entries, setMany } from 'idb-keyval'
import type { PlaylistSource } from '../iptv/playlists'

/** The file that a backup gives. */
export interface Backup {
  app: 'ZettaLive'
  version: 1
  exportedAt: number
  /** The stored values, by their IndexedDB key. */
  data: Record<string, unknown>
}

export class BackupError extends Error {}

/**
 * True for the keys that a backup keeps: the playlists, the guides, the
 * profiles, and the data of each profile. The text of a playlist from a file
 * stays too, because the app cannot load it again. Saved copies of URLs and
 * guides do not stay, because the app loads them again.
 */
function keeps(key: string, fileIds: Set<string>): boolean {
  if (['playlists', 'guides', 'profiles', 'active-profile'].includes(key)) return true
  if (key.startsWith('library:') || key.startsWith('settings:')) return true
  return key.startsWith('playlist-text:') && fileIds.has(key.slice('playlist-text:'.length))
}

export async function makeBackup(now = Date.now()): Promise<Backup> {
  const all = new Map((await entries()).map(([k, v]) => [String(k), v as unknown]))
  const sources = (all.get('playlists') as PlaylistSource[] | undefined) ?? []
  const fileIds = new Set(sources.filter((s) => !s.url).map((s) => s.id))
  const data: Record<string, unknown> = {}
  for (const [key, value] of all) if (keeps(key, fileIds)) data[key] = value
  return { app: 'ZettaLive', version: 1, exportedAt: now, data }
}

/** Reads a backup file. Throws a BackupError when the file is not a backup of ZettaLive. */
export function readBackup(text: string): Backup {
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    throw new BackupError('The file is not a ZettaLive backup.')
  }
  const backup = value as Partial<Backup> | null
  if (!backup || backup.app !== 'ZettaLive' || typeof backup.data !== 'object' || backup.data === null) {
    throw new BackupError('The file is not a ZettaLive backup.')
  }
  if (backup.version !== 1) throw new BackupError('This backup is from a newer version of ZettaLive.')
  return backup as Backup
}

/** Replaces all the data of the app with the data of the backup. */
export async function restoreBackup(backup: Backup): Promise<void> {
  await clear()
  await setMany(Object.entries(backup.data))
}

/** The name of the backup file, such as zettalive-backup-2026-10-17.json. */
export function backupFileName(now = Date.now()): string {
  return `zettalive-backup-${new Date(now).toISOString().slice(0, 10)}.json`
}
