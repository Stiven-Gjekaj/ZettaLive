import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { clear } from 'idb-keyval'
import { usePlaylists } from '../iptv/playlists'
import { PlaylistsScreen } from './PlaylistsScreen'

const LIST = '#EXTM3U\n#EXTINF:-1,One\nhttps://s.example/1.m3u8\n#EXTINF:-1,Two\nhttps://s.example/2.m3u8\n'

beforeEach(async () => {
  await clear()
  usePlaylists.setState({ sources: [], results: {}, started: false })
  vi.stubGlobal('fetch', async () => new Response(LIST))
})

afterEach(() => vi.unstubAllGlobals())

test('adds a playlist from a URL and shows its channel count', async () => {
  render(<PlaylistsScreen />)
  expect(screen.getByText('You have no playlists. Add one above.')).toBeTruthy()
  fireEvent.change(screen.getByLabelText('Add a playlist from a URL'), { target: { value: 'https://a.example/uk.m3u' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  const card = await screen.findByRole('listitem', { name: 'uk' })
  await waitFor(() => expect(within(card).getByText(/^2 channels, updated/)).toBeTruthy())
})

test('refuses a cleartext URL on an HTTPS page, and a text that is not a URL', () => {
  vi.stubGlobal('location', { protocol: 'https:' })
  render(<PlaylistsScreen />)
  const input = screen.getByLabelText('Add a playlist from a URL')
  fireEvent.change(input, { target: { value: 'http://a.example/uk.m3u' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  expect(screen.getByRole('alert').textContent).toContain('starts with http://')
  fireEvent.change(input, { target: { value: 'my list' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  expect(screen.getByRole('alert').textContent).toContain('starts with https://')
  expect(usePlaylists.getState().sources).toEqual([])
})

test('removes a playlist after the user confirms', async () => {
  await usePlaylists.getState().addUrl('https://a.example/uk.m3u')
  vi.stubGlobal('confirm', () => true)
  render(<PlaylistsScreen />)
  fireEvent.click(within(screen.getByRole('listitem', { name: 'uk' })).getByRole('button', { name: 'Remove' }))
  await waitFor(() => expect(screen.queryByRole('listitem')).toBeNull())
})
