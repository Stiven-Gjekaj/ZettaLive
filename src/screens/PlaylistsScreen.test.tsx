import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { clear } from 'idb-keyval'
import { usePlaylists } from '../iptv/playlists'
import { PlaylistsScreen } from './PlaylistsScreen'
import { useGuides } from '../guide/guides'

const LIST = '#EXTM3U\n#EXTINF:-1,One\nhttps://s.example/1.m3u8\n#EXTINF:-1,Two\nhttps://s.example/2.m3u8\n'

beforeEach(async () => {
  await clear()
  usePlaylists.setState({ sources: [], results: {}, started: false })
  useGuides.setState({ sources: [], results: {} })
  vi.stubGlobal('fetch', async () => new Response(LIST))
})

afterEach(() => vi.unstubAllGlobals())

test('adds a playlist from a URL and shows its channel count', async () => {
  render(<PlaylistsScreen />)
  expect(screen.getByText('You have no playlists. Add one above.')).toBeTruthy()
  fireEvent.change(screen.getByLabelText('Add playlists and guides'), { target: { value: 'https://a.example/uk.m3u' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  const card = await screen.findByRole('listitem', { name: 'uk' })
  await waitFor(() => expect(within(card).getByText(/^2 channels, updated/)).toBeTruthy())
  expect(screen.getByRole('status').textContent).toContain('Added 1 playlist and 0 guides.')
})

test('adds a whole pasted list, and says what it skipped', async () => {
  vi.stubGlobal('location', { protocol: 'https:' })
  vi.stubGlobal('fetch', async (input: RequestInfo | URL) =>
    new Response(String(input).endsWith('.xml') ? '<tv><channel id="a"><display-name>A</display-name></channel></tv>' : LIST),
  )
  render(<PlaylistsScreen />)
  const list = ['# IPTV playlists', 'https://a.example/al.m3u', 'https://a.example/sqi.m3u', '# TV guide', 'https://g.example/TV.xml', 'http://old.example/x.m3u', 'https://v3-cinemeta.strem.io/manifest.json'].join('\n')
  fireEvent.change(screen.getByLabelText('Add playlists and guides'), { target: { value: list } })
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Added 2 playlists and 1 guide.'))
  expect(screen.getByRole('status').textContent).toContain('Skipped 1 Stremio addon.')
  expect(screen.getByRole('status').textContent).toContain('Skipped 1 http:// URL.')
  expect(await screen.findByRole('listitem', { name: 'al' })).toBeTruthy()
  expect(await screen.findByRole('listitem', { name: 'https://g.example/TV.xml' })).toBeTruthy()
})

test('removes a playlist after the user confirms', async () => {
  await usePlaylists.getState().addUrl('https://a.example/uk.m3u')
  vi.stubGlobal('confirm', () => true)
  render(<PlaylistsScreen />)
  fireEvent.click(within(screen.getByRole('listitem', { name: 'uk' })).getByRole('button', { name: 'Remove' }))
  await waitFor(() => expect(screen.queryByRole('listitem')).toBeNull())
})

test('adds an Xtream Codes account, and does not show its password', async () => {
  render(<PlaylistsScreen />)
  fireEvent.change(screen.getByLabelText('Server'), { target: { value: 'tv.example' } })
  fireEvent.change(screen.getByLabelText('User name'), { target: { value: 'me' } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add account' }))
  const card = await screen.findByRole('listitem', { name: 'tv.example' })
  expect(within(card).getByText('Xtream Codes account me on tv.example')).toBeTruthy()
  expect(card.textContent).not.toContain('secret')
})

test('groups the guides that playlists name and that did not load', () => {
  usePlaylists.setState({
    sources: [{ id: 'p', name: 'Free', url: 'https://a.example/x.m3u', addedAt: 0 }],
    results: { p: { status: 'ready', channels: [], guideUrls: ['https://g.example/1.xml', 'https://g.example/2.xml', 'https://g.example/3.xml'] } },
  })
  useGuides.setState({
    results: {
      'https://g.example/1.xml': { status: 'failed', error: 'No CORS.' },
      'https://g.example/2.xml': { status: 'failed', error: 'No CORS.' },
      'https://g.example/3.xml': { status: 'ready', guide: { channels: [], programmes: {} }, savedAt: 0 },
    },
  })
  render(<PlaylistsScreen />)
  const group = screen.getByRole('listitem', { name: 'Guides that did not load' })
  expect(within(group).getByText('2 guides that playlists name did not load.')).toBeTruthy()
  expect(screen.getByRole('listitem', { name: 'https://g.example/3.xml' })).toBeTruthy()
  expect(screen.queryByRole('listitem', { name: 'https://g.example/1.xml' })).toBeNull()
})
