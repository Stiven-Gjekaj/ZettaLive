import { fireEvent, render, screen, within } from '@testing-library/react'
import { clear } from 'idb-keyval'
import { usePlaylists } from '../iptv/playlists'
import { useLibrary, EMPTY_LIBRARY } from '../library/library'
import { LiveScreen } from './LiveScreen'
import { usePlayer } from '../player/player'
import { useHealth } from '../player/health'
import type { Channel } from '../iptv/m3u'

const channel = (id: string, name: string, group?: string): Channel => ({ id, playlistId: 'p', name, url: `https://s.example/${id}`, group })

function setChannels(channels: Channel[]) {
  usePlaylists.setState({
    sources: [{ id: 'p', name: 'Mine', url: 'https://a.example/x.m3u', addedAt: 0 }],
    results: { p: { status: 'ready', channels, guideUrls: [] } },
  })
}

const rows = () => within(screen.getByRole('list', { name: 'Channels' })).getAllByRole('listitem').map((r) => r.querySelector('.channel-name')?.textContent)

beforeEach(async () => {
  await clear()
  useLibrary.setState({ ...EMPTY_LIBRARY, profileId: 'default' })
  usePlaylists.setState({ sources: [], results: {} })
})

test('asks for a playlist when there is none', () => {
  render(<LiveScreen />)
  expect(screen.getByRole('button', { name: 'Add a playlist' })).toBeTruthy()
})

test('lists the channels with numbers, and filters by group and search', () => {
  setChannels([channel('a', 'BBC One', 'News'), channel('b', 'Film Four', 'Films'), channel('c', 'Sky News', 'News')])
  render(<LiveScreen />)
  expect(rows()).toEqual(['BBC One', 'Film Four', 'Sky News'])
  fireEvent.click(screen.getByRole('button', { name: 'Films' }))
  expect(rows()).toEqual(['Film Four'])
  fireEvent.click(screen.getByRole('button', { name: 'All' }))
  fireEvent.change(screen.getByLabelText('Search channels'), { target: { value: 'news' } })
  expect(rows()).toEqual(['Sky News'])
})

test('adds a favourite, hides a channel and a group, and shows them again', () => {
  setChannels([channel('a', 'BBC One', 'News'), channel('b', 'Film Four', 'Films'), channel('c', 'Sky News', 'News')])
  render(<LiveScreen />)
  fireEvent.click(screen.getByRole('button', { name: 'Add Sky News to favourites' }))
  fireEvent.click(screen.getByRole('button', { name: 'Favourites' }))
  expect(rows()).toEqual(['Sky News'])

  fireEvent.click(screen.getByRole('button', { name: 'All' }))
  const film = screen.getAllByRole('listitem')[1]!
  fireEvent.click(within(film).getByRole('button', { name: 'Hide' }))
  expect(rows()).toEqual(['BBC One', 'Sky News'])

  fireEvent.click(screen.getByRole('button', { name: 'News' }))
  fireEvent.click(screen.getByRole('button', { name: 'Hide this group' }))
  expect(screen.getByText('No channel matches.')).toBeTruthy()

  fireEvent.click(screen.getByRole('button', { name: 'Hidden (3)' }))
  expect(rows()).toEqual(['BBC One', 'Film Four', 'Sky News'])
  fireEvent.click(screen.getByRole('button', { name: 'Show News' }))
  expect(rows()).toEqual(['Film Four'])
  expect(useLibrary.getState()).toMatchObject({ favourites: ['c'], hiddenChannels: ['b'], hiddenGroups: [] })
})

test('draws only the rows near the visible part of a long list', () => {
  setChannels(Array.from({ length: 5000 }, (_, i) => channel(`id${i}`, `Channel ${i}`)))
  render(<LiveScreen />)
  expect(rows().length).toBeLessThan(40)
  expect(rows()[0]).toBe('Channel 0')
})

test('opens the player with the shown list, and marks a channel that cannot play', () => {
  setChannels([channel('a', 'BBC One', 'News'), channel('b', 'Film Four', 'Films'), channel('c', 'Sky News', 'News')])
  useHealth.setState({ blocked: { c: 'network' } })
  render(<LiveScreen />)
  fireEvent.click(screen.getByRole('button', { name: 'News' }))
  fireEvent.click(screen.getByRole('button', { name: 'Play Sky News' }))
  expect(usePlayer.getState()).toMatchObject({ channelId: 'c', order: ['a', 'c'] })
  expect(screen.getAllByText('Cannot play here')).toHaveLength(1)
})
