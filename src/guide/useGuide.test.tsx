import { act, renderHook } from '@testing-library/react'
import { numberChannels } from '../iptv/channels'
import { usePlaylists } from '../iptv/playlists'
import { useGuides } from './guides'
import { matchChannels, useChannelProgrammes } from './useGuide'
import type { Guide } from './xmltv'

const GUIDE: Guide = { channels: [{ id: 'a', names: ['A'] }], programmes: { a: [{ start: 0, stop: 1, title: 'Show' }] } }

beforeEach(() => {
  usePlaylists.setState({
    sources: [{ id: 'p', name: 'P', url: 'https://a.example/x.m3u', addedAt: 0 }],
    results: { p: { status: 'ready', channels: [{ id: 'p:1', playlistId: 'p', name: 'A', url: 'https://s.example/1', tvgId: 'a' }], guideUrls: ['https://g.example/1.xml', 'https://g.example/2.xml'] } },
  })
  useGuides.setState({ sources: [], results: { 'https://g.example/1.xml': { status: 'ready', guide: GUIDE } } })
})

test('matches again only when a guide changes, not when a guide fails', () => {
  const { result } = renderHook(() => useChannelProgrammes())
  const first = result.current
  expect(first.get('p:1')?.[0]?.title).toBe('Show')
  act(() => useGuides.setState((s) => ({ results: { ...s.results, 'https://g.example/2.xml': { status: 'loading' } } })))
  act(() => useGuides.setState((s) => ({ results: { ...s.results, 'https://g.example/2.xml': { status: 'failed', error: 'No' } } })))
  expect(result.current).toBe(first)
  act(() => useGuides.setState((s) => ({ results: { ...s.results, 'https://g.example/2.xml': { status: 'ready', guide: { channels: [], programmes: {} } } } })))
  expect(result.current).not.toBe(first)
})

test('gives the same result to each caller with the same guides and channels', () => {
  const channels = numberChannels([{ id: 'p:1', playlistId: 'p', name: 'A', url: 'https://s.example/1', tvgId: 'a' }])
  expect(matchChannels([GUIDE], channels)).toBe(matchChannels([GUIDE], channels))
})
