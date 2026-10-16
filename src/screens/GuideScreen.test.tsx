import { fireEvent, render, screen, within } from '@testing-library/react'
import { useGuides } from '../guide/guides'
import type { Guide } from '../guide/xmltv'
import type { Channel } from '../iptv/m3u'
import { usePlaylists } from '../iptv/playlists'
import { EMPTY_LIBRARY, useLibrary } from '../library/library'
import { usePlayer } from '../player/player'
import { GuideScreen, gridStart } from './GuideScreen'

const NOW = Date.parse('2026-10-17T10:10:00Z')
const at = (iso: string) => Date.parse(iso)

const GUIDE: Guide = {
  channels: [{ id: 'news', names: ['News One'] }],
  programmes: {
    news: [
      { start: at('2026-10-17T10:00:00Z'), stop: at('2026-10-17T11:00:00Z'), title: 'Morning News', description: 'The news of the day.' },
      { start: at('2026-10-17T11:00:00Z'), stop: at('2026-10-17T12:00:00Z'), title: 'Weather' },
    ],
  },
}

const channel = (id: string, name: string, tvgId?: string): Channel => ({ id, playlistId: 'p', name, url: `https://s.example/${id}.m3u8`, tvgId })

beforeEach(() => {
  vi.useFakeTimers({ now: NOW, toFake: ['Date'] })
  useLibrary.setState({ ...EMPTY_LIBRARY, profileId: 'default' })
  usePlaylists.setState({
    sources: [{ id: 'p', name: 'Mine', url: 'https://a.example/x.m3u', addedAt: 0 }],
    results: { p: { status: 'ready', channels: [channel('a', 'News One HD', 'news'), channel('b', 'No Guide')], guideUrls: ['https://g.example/e.xml'] } },
  })
  useGuides.setState({ sources: [], results: { 'https://g.example/e.xml': { status: 'ready', guide: GUIDE } } })
})

afterEach(() => {
  vi.useRealTimers()
  usePlayer.setState({ channelId: null, order: [] })
})

test('starts the grid at the half hour before the half hour of now', () => {
  expect(gridStart(at('2026-10-17T10:10:00Z'))).toBe(at('2026-10-17T09:30:00Z'))
  expect(gridStart(at('2026-10-17T10:30:00Z'))).toBe(at('2026-10-17T10:00:00Z'))
})

test('shows a row for each channel with a guide, and the details of a programme', () => {
  render(<GuideScreen />)
  const rows = screen.getAllByRole('row')
  expect(rows).toHaveLength(1)
  expect(within(rows[0]!).getByRole('rowheader').textContent).toContain('News One HD')
  fireEvent.click(screen.getByRole('gridcell', { name: /Morning News/ }))
  const sheet = screen.getByRole('dialog', { name: 'Morning News' })
  expect(within(sheet).getByText('The news of the day.')).toBeTruthy()
  fireEvent.click(within(sheet).getByRole('button', { name: 'Watch News One HD' }))
  expect(usePlayer.getState()).toMatchObject({ channelId: 'a', order: ['a'] })
})

test('shows only favourites when the user asks', () => {
  render(<GuideScreen />)
  fireEvent.click(screen.getByRole('button', { name: 'Favourites' }))
  expect(screen.getByText('No channel with a guide matches.')).toBeTruthy()
})

test('asks for a guide when none is loaded', () => {
  useGuides.setState({ results: {} })
  render(<GuideScreen />)
  expect(screen.getByRole('button', { name: 'Add a guide' })).toBeTruthy()
})

test('plays a past programme from the start on a catch-up channel', () => {
  const list = usePlaylists.getState().results.p!.channels
  usePlaylists.setState({
    results: { p: { status: 'ready', channels: [{ ...list[0]!, catchup: 'shift', catchupDays: 1 }], guideUrls: ['https://g.example/e.xml'] } },
  })
  const past = { start: at('2026-10-17T09:00:00Z'), stop: at('2026-10-17T10:00:00Z'), title: 'Early' }
  useGuides.setState({ results: { 'https://g.example/e.xml': { status: 'ready', guide: { ...GUIDE, programmes: { news: [past, ...GUIDE.programmes.news!] } } } } })
  render(<GuideScreen />)
  fireEvent.click(screen.getByRole('gridcell', { name: /Early/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Watch from the start' }))
  expect(usePlayer.getState().catchup).toEqual({ url: `https://s.example/a.m3u8?utc=${at('2026-10-17T09:00:00Z') / 1000}&lutc=${NOW / 1000}`, title: 'Early' })
})

test('offers no catch-up for a programme that is on now', () => {
  render(<GuideScreen />)
  fireEvent.click(screen.getByRole('gridcell', { name: /Morning News/ }))
  expect(screen.queryByRole('button', { name: 'Watch from the start' })).toBeNull()
})
