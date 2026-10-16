import { act, fireEvent, render, screen } from '@testing-library/react'
import type { Channel } from '../iptv/m3u'
import { usePlaylists } from '../iptv/playlists'
import type { EngineEvents } from './engine'
import { useHealth } from './health'
import { usePlayer } from './player'
import { PlayerView } from './PlayerView'
import { EMPTY_LIBRARY, useLibrary } from '../library/library'

const started: { url: string; kind: string; events: EngineEvents }[] = []

vi.mock('./engine', () => ({
  startEngine: async (_video: HTMLVideoElement, url: string, kind: string, events: EngineEvents) => {
    started.push({ url, kind, events })
    return { destroy() {}, audioTracks: () => [], audioTrack: () => -1, setAudioTrack() {}, levels: () => [], level: () => -1, setLevel() {} }
  },
}))

const channel = (id: string, name: string, url: string, number?: number): Channel => ({ id, playlistId: 'p', name, url, number })

const CHANNELS = [
  channel('a', 'One', 'https://s.example/one.m3u8', 1),
  channel('b', 'Two', 'https://s.example/two', 2),
  channel('c', 'Plain', 'http://s.example/three.m3u8', 30),
]

beforeEach(() => {
  started.length = 0
  useHealth.setState({ blocked: {} })
  usePlaylists.setState({
    sources: [{ id: 'p', name: 'Mine', addedAt: 0 }],
    results: { p: { status: 'ready', channels: CHANNELS, guideUrls: [] } },
  })
  vi.stubGlobal('location', { protocol: 'https:' })
})

afterEach(() => {
  vi.unstubAllGlobals()
  usePlayer.setState({ channelId: null, order: [] })
})

const title = () => document.querySelector('.player-title .channel-name')?.textContent

test('plays the open channel with the engine for its kind', async () => {
  usePlayer.getState().open('a', ['a', 'b', 'c'])
  render(<PlayerView />)
  await act(async () => {})
  expect(title()).toBe('1 One')
  expect(started).toMatchObject([{ url: 'https://s.example/one.m3u8', kind: 'hls' }])
})

test('does not start a cleartext stream, and marks the channel', async () => {
  usePlayer.getState().open('c', ['a', 'b', 'c'])
  render(<PlayerView />)
  await act(async () => {})
  expect(screen.getByRole('alert').textContent).toContain('uses http://')
  expect(started).toEqual([])
  expect(useHealth.getState().blocked).toEqual({ c: 'cleartext' })
})

test('marks a stream that fails before it plays, and tries MPEG-TS when HLS does not fit', async () => {
  usePlayer.getState().open('b', ['a', 'b', 'c'])
  render(<PlayerView />)
  await act(async () => {})
  await act(async () => started[0]?.events.onStop('wrong-kind'))
  expect(started.map((s) => s.kind)).toEqual(['hls', 'mpegts'])
  await act(async () => started[1]?.events.onStop('network'))
  expect(screen.getByRole('alert').textContent).toContain('no CORS headers')
  expect(useHealth.getState().blocked).toEqual({ b: 'network' })
})

test('moves to the next and the previous channel, and goes to a typed number', async () => {
  usePlayer.getState().open('a', ['a', 'b', 'c'])
  render(<PlayerView />)
  await act(async () => {})
  fireEvent.keyDown(window, { key: 'ArrowDown' })
  expect(title()).toBe('2 Two')
  fireEvent.keyDown(window, { key: 'ArrowUp' })
  fireEvent.keyDown(window, { key: 'ArrowUp' })
  expect(title()).toBe('30 Plain')
  fireEvent.keyDown(window, { key: '1' })
  fireEvent.keyDown(window, { key: 'Enter' })
  expect(title()).toBe('1 One')
  fireEvent.keyDown(window, { key: '9' })
  fireEvent.keyDown(window, { key: 'Enter' })
  expect(screen.getByText('There is no channel 9.')).toBeTruthy()
  expect(title()).toBe('1 One')
})

test('closes with Escape', async () => {
  usePlayer.getState().open('a', ['a'])
  render(<PlayerView />)
  fireEvent.keyDown(window, { key: 'Escape' })
  expect(usePlayer.getState().channelId).toBeNull()
  expect(screen.queryByRole('dialog')).toBeNull()
})

test('adds a channel to the recent channels when it plays', async () => {
  useLibrary.setState({ ...EMPTY_LIBRARY, profileId: 'default' })
  usePlayer.getState().open('a', ['a'])
  render(<PlayerView />)
  await act(async () => {})
  expect(useLibrary.getState().recents).toEqual([])
  fireEvent(document.querySelector('video')!, new Event('playing'))
  expect(useLibrary.getState().recents).toEqual(['a'])
  expect(screen.queryByRole('status')).toBeNull()
})
