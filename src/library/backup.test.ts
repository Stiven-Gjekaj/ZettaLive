import { clear, entries, get, set, setMany } from 'idb-keyval'
import { BackupError, backupFileName, makeBackup, readBackup, restoreBackup } from './backup'

beforeEach(() => clear())

const STORED: [string, unknown][] = [
  ['playlists', [{ id: 'u', name: 'URL', url: 'https://a.example/x.m3u', addedAt: 1 }, { id: 'f', name: 'File', addedAt: 2 }]],
  ['playlist-text:u', { text: '#EXTM3U url copy', savedAt: 1 }],
  ['playlist-text:f', { text: '#EXTM3U file', savedAt: 2 }],
  ['guides', [{ id: 'g', url: 'https://g.example/e.xml', addedAt: 3 }]],
  ['guide:https://g.example/e.xml', { guide: { channels: [], programmes: {} }, savedAt: 3 }],
  ['profiles', [{ id: 'default', name: 'Me', avatar: 0 }]],
  ['active-profile', 'default'],
  ['library:default', { favourites: ['u:a'], hiddenGroups: [], hiddenChannels: [], recents: [] }],
  ['settings:default', { hideBlocked: true, startScreen: 'guide' }],
]

test('keeps the choices and the file playlists, but not the copies that load again', async () => {
  await setMany(STORED)
  const backup = await makeBackup(Date.parse('2026-10-17T12:00:00Z'))
  expect(backup).toMatchObject({ app: 'ZettaLive', version: 1 })
  expect(Object.keys(backup.data).sort()).toEqual(
    ['active-profile', 'guides', 'library:default', 'playlist-text:f', 'playlists', 'profiles', 'settings:default'].sort(),
  )
})

test('restores a backup in place of all the data', async () => {
  await setMany(STORED)
  const text = JSON.stringify(await makeBackup())
  await clear()
  await set('library:other', { favourites: ['x'] })
  await restoreBackup(readBackup(text))
  expect(await get('library:other')).toBeUndefined()
  expect(await get('settings:default')).toEqual({ hideBlocked: true, startScreen: 'guide' })
  expect(await get('playlist-text:f')).toEqual({ text: '#EXTM3U file', savedAt: 2 })
  expect((await entries()).length).toBe(7)
})

test('refuses a file that is not a backup, or that is from a newer version', () => {
  expect(() => readBackup('not json')).toThrow(BackupError)
  expect(() => readBackup('{"app":"Other","version":1,"data":{}}')).toThrow('not a ZettaLive backup')
  expect(() => readBackup('{"app":"ZettaLive","version":2,"data":{}}')).toThrow('newer version')
})

test('names the file with the date', () => {
  expect(backupFileName(Date.parse('2026-10-17T12:00:00Z'))).toBe('zettalive-backup-2026-10-17.json')
})
