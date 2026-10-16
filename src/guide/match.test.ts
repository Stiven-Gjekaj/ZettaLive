import type { Channel } from '../iptv/m3u'
import { indexGuides, matchName, programmesOf } from './match'
import type { Guide, Programme } from './xmltv'

const show = (title: string): Programme => ({ start: 0, stop: 1, title })

const FIRST: Guide = {
  channels: [{ id: 'BBCOne.uk', names: ['BBC One HD'] }, { id: 'cafe', names: ['Café TV'] }],
  programmes: { 'BBCOne.uk': [show('First guide')], cafe: [show('Cooking')] },
}
const SECOND: Guide = {
  channels: [{ id: 'bbcone.uk', names: ['BBC One'] }, { id: 'sky', names: ['Sky News'] }],
  programmes: { 'bbcone.uk': [show('Second guide')], sky: [show('Headlines')] },
}

const channel = (name: string, extra: Partial<Channel> = {}): Channel => ({ id: name, playlistId: 'p', name, url: 'https://s.example/x', ...extra })
const title = (list: Programme[] | undefined) => list?.[0]?.title

test('makes names that compare well', () => {
  expect(matchName('BBC One HD (1080p) [Geo-blocked]')).toBe('bbcone')
  expect(matchName('Café-TV 4K')).toBe('cafetv')
})

test('finds the programmes by tvg-id with no case, and the first guide wins', () => {
  const index = indexGuides([FIRST, SECOND])
  expect(title(programmesOf(channel('Anything', { tvgId: 'bbcone.UK' }), index))).toBe('First guide')
})

test('finds the programmes by tvg-name, then by name, when the tvg-id does not match', () => {
  const index = indexGuides([FIRST, SECOND])
  expect(title(programmesOf(channel('X', { tvgId: 'none', tvgName: 'Sky News HD' }), index))).toBe('Headlines')
  expect(title(programmesOf(channel('Cafe TV (720p)'), index))).toBe('Cooking')
  expect(programmesOf(channel('Unknown'), index)).toBeUndefined()
})
