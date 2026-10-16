import { channelByNumber, fold, groupsOf, listChannels, numberChannels, type ListOptions } from './channels'
import type { Channel } from './m3u'

const channel = (id: string, name: string, extra: Partial<Channel> = {}): Channel => ({ id, playlistId: 'p', name, url: `https://s.example/${id}`, ...extra })

const CHANNELS = numberChannels([
  channel('a', 'BBC One', { group: 'News', number: 2 }),
  channel('b', 'Café TV', { group: 'Food' }),
  channel('c', 'Sky News', { group: 'News' }),
  channel('d', 'No Group'),
])

const options = (o: Partial<ListOptions> = {}): ListOptions => ({
  filter: { kind: 'all' },
  query: '',
  favourites: [],
  hiddenGroups: [],
  hiddenChannels: [],
  ...o,
})

const names = (list: { name: string }[]) => list.map((c) => c.name)

test('keeps the tvg-chno number and gives the next free numbers to the rest', () => {
  expect(CHANNELS.map((c) => c.shown)).toEqual([2, 1, 3, 4])
  expect(channelByNumber(CHANNELS, 3)?.name).toBe('Sky News')
  expect(channelByNumber(CHANNELS, 9)).toBeUndefined()
})

test('lists the groups in the order of their first channel', () => {
  expect(groupsOf(CHANNELS)).toEqual(['News', 'Food', 'Other'])
})

test('filters by group and by favourites', () => {
  expect(names(listChannels(CHANNELS, options({ filter: { kind: 'group', group: 'News' } })))).toEqual(['BBC One', 'Sky News'])
  expect(names(listChannels(CHANNELS, options({ filter: { kind: 'group', group: 'Other' } })))).toEqual(['No Group'])
  expect(names(listChannels(CHANNELS, options({ filter: { kind: 'favourites' }, favourites: ['c', 'x'] })))).toEqual(['Sky News'])
})

test('searches the name with no case and no accents, and the number', () => {
  expect(fold('Café')).toBe('cafe')
  expect(names(listChannels(CHANNELS, options({ query: ' cafe ' })))).toEqual(['Café TV'])
  expect(names(listChannels(CHANNELS, options({ query: 'NEWS' })))).toEqual(['Sky News'])
  expect(names(listChannels(CHANNELS, options({ query: '2' })))).toEqual(['BBC One'])
})

test('hides a channel or a group everywhere, and shows them in the hidden filter', () => {
  const hiding = { hiddenGroups: ['Food'], hiddenChannels: ['a'] }
  expect(names(listChannels(CHANNELS, options(hiding)))).toEqual(['Sky News', 'No Group'])
  expect(names(listChannels(CHANNELS, options({ ...hiding, filter: { kind: 'favourites' }, favourites: ['a', 'c'] })))).toEqual(['Sky News'])
  expect(names(listChannels(CHANNELS, options({ ...hiding, filter: { kind: 'hidden' } })))).toEqual(['BBC One', 'Café TV'])
})

test('lists the recent channels in their order, and skips the channels that the caller asks', () => {
  expect(names(listChannels(CHANNELS, options({ filter: { kind: 'recent' }, recents: ['c', 'x', 'a'] })))).toEqual(['Sky News', 'BBC One'])
  expect(names(listChannels(CHANNELS, options({ filter: { kind: 'recent' }, recents: ['c', 'a'], hiddenChannels: ['a'] })))).toEqual(['Sky News'])
  expect(names(listChannels(CHANNELS, options({ skip: (c) => c.id === 'b' })))).toEqual(['BBC One', 'Sky News', 'No Group'])
  expect(names(listChannels(CHANNELS, options({ filter: { kind: 'recent' }, recents: ['b', 'c'], skip: (c) => c.id === 'b' })))).toEqual(['Sky News'])
})
