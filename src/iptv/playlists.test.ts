import { clear } from 'idb-keyval'
import { allChannels, createPlaylists, nameFromUrl } from './playlists'

const LIST = '#EXTM3U url-tvg="https://g.example/epg.xml"\n#EXTINF:-1 group-title="News",One\nhttps://s.example/1.m3u8\n#EXTINF:-1,Two\nhttps://s.example/2.m3u8\n'

function server(routes: Record<string, string | number>) {
  return (async (input: RequestInfo | URL) => {
    const answer = routes[String(input)]
    if (answer === undefined) throw new TypeError('Failed to fetch')
    return typeof answer === 'number' ? new Response('', { status: answer }) : new Response(answer)
  }) as typeof fetch
}

beforeEach(() => clear())

test('adds a playlist from a URL, reads it, and keeps it for the next start', async () => {
  const store = createPlaylists(server({ 'https://a.example/tv.m3u': LIST }))
  await store.getState().addUrl('https://a.example/tv.m3u')
  const [source] = store.getState().sources
  expect(source?.name).toBe('tv')
  expect(store.getState().results[source!.id]).toMatchObject({ status: 'ready', guideUrls: ['https://g.example/epg.xml'] })
  expect(allChannels(store.getState()).map((c) => c.name)).toEqual(['One', 'Two'])

  const next = createPlaylists(server({ 'https://a.example/tv.m3u': LIST }))
  await next.getState().start()
  expect(next.getState().sources).toEqual(store.getState().sources)
  expect(allChannels(next.getState())).toHaveLength(2)
})

test('shows the saved copy and the reason when a URL fails at the next start', async () => {
  const store = createPlaylists(server({ 'https://a.example/tv.m3u': LIST }))
  await store.getState().addUrl('https://a.example/tv.m3u', 'My TV')
  const next = createPlaylists(server({ 'https://a.example/tv.m3u': 503 }))
  await next.getState().start()
  const id = next.getState().sources[0]!.id
  expect(next.getState().sources[0]?.name).toBe('My TV')
  expect(next.getState().results[id]).toMatchObject({ status: 'ready', error: 'The server answered with the error 503.' })
  expect(next.getState().results[id]?.channels).toHaveLength(2)
})

test('marks a playlist that never loaded as failed, with the reason', async () => {
  const store = createPlaylists(server({ 'https://a.example/page': '<html></html>' }))
  await store.getState().addUrl('https://a.example/page')
  const id = store.getState().sources[0]!.id
  expect(store.getState().results[id]).toMatchObject({ status: 'failed', error: 'The file is not an M3U playlist.' })
})

test('adds a playlist from a file and keeps its text', async () => {
  const store = createPlaylists(server({}))
  await store.getState().addFile(new File([LIST], 'home.m3u'))
  const next = createPlaylists(server({}))
  await next.getState().start()
  expect(next.getState().sources[0]?.name).toBe('home')
  expect(allChannels(next.getState())).toHaveLength(2)
})

test('refuses a file that is not a playlist, and adds nothing', async () => {
  const store = createPlaylists(server({}))
  await expect(store.getState().addFile(new File(['hello'], 'notes.txt'))).rejects.toThrow('not an M3U playlist')
  expect(store.getState().sources).toEqual([])
})

test('renames and removes a playlist, also for the next start', async () => {
  const store = createPlaylists(server({ 'https://a.example/tv.m3u': LIST, 'https://b.example/b.m3u': LIST }))
  await store.getState().addUrl('https://a.example/tv.m3u')
  await store.getState().addUrl('https://b.example/b.m3u')
  const [a, b] = store.getState().sources
  await store.getState().rename(b!.id, 'Second')
  await store.getState().remove(a!.id)
  const next = createPlaylists(server({ 'https://b.example/b.m3u': LIST }))
  await next.getState().start()
  expect(next.getState().sources.map((s) => s.name)).toEqual(['Second'])
})

test('makes a name from a URL', () => {
  expect(nameFromUrl('https://iptv-org.github.io/iptv/countries/uk.m3u')).toBe('uk')
  expect(nameFromUrl('https://provider.example/get.php?user=a&type=m3u')).toBe('provider.example')
  expect(nameFromUrl('https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8')).toBe('Free-TV')
  expect(nameFromUrl('https://raw.githubusercontent.com/doms9/iptv/default/M3U8/TV.m3u8')).toBe('TV')
  expect(nameFromUrl('https://someone.github.io/tv/playlist.m3u')).toBe('someone')
  expect(nameFromUrl('not a url')).toBe('not a url')
})

test('adds an Xtream Codes account, with the guide of the account', async () => {
  const playlist = 'https://tv.example/get.php?username=me&password=pw&type=m3u_plus&output=m3u8'
  const store = createPlaylists(server({ [playlist]: LIST }))
  await store.getState().addXtream({ server: 'tv.example/', username: ' me ', password: 'pw' })
  const [source] = store.getState().sources
  expect(source).toMatchObject({ name: 'tv.example', url: playlist, xtream: { server: 'tv.example/', username: 'me', password: 'pw' } })
  expect(store.getState().results[source!.id]?.guideUrls).toEqual(['https://g.example/epg.xml', 'https://tv.example/xmltv.php?username=me&password=pw'])
})
