import { clear } from 'idb-keyval'
import { useGuides } from '../guide/guides'
import { addPastedList, summaryText } from './addList'
import { usePlaylists } from './playlists'

const LIST = '#EXTM3U\n#EXTINF:-1,One\nhttps://s.example/1.m3u8\n'
const GUIDE = '<tv><channel id="a"><display-name>A</display-name></channel></tv>'

beforeEach(async () => {
  await clear()
  usePlaylists.setState({ sources: [], results: {}, started: false })
  useGuides.setState({ sources: [], results: {} })
  vi.stubGlobal('location', { protocol: 'https:' })
  vi.stubGlobal('fetch', async (input: RequestInfo | URL) => new Response(String(input).endsWith('.xml') ? GUIDE : LIST))
})

afterEach(() => vi.unstubAllGlobals())

const BLOCK = `# IPTV playlists, Albania first
https://iptv-org.github.io/iptv/countries/al.m3u
https://iptv-org.github.io/iptv/languages/sqi.m3u
# TV guide
https://raw.githubusercontent.com/doms9/iptv/refs/heads/default/M3U8/TV.xml
https://v3-cinemeta.strem.io/manifest.json
http://old.example/list.m3u
`

test('adds the playlists and the guides of a pasted list, and skips the rest', async () => {
  const summary = await addPastedList(BLOCK)
  expect(summary).toEqual({ playlists: 2, guides: 1, existing: 0, addons: 1, cleartext: 1, notUrl: 0 })
  expect(usePlaylists.getState().sources.map((s) => s.name)).toEqual(['al', 'sqi'])
  expect(useGuides.getState().sources.map((s) => s.url)).toEqual(['https://raw.githubusercontent.com/doms9/iptv/refs/heads/default/M3U8/TV.xml'])
  expect(Object.values(usePlaylists.getState().results).every((r) => r.status === 'ready')).toBe(true)
})

test('adds nothing twice when the same list is pasted again', async () => {
  await addPastedList(BLOCK)
  const again = await addPastedList(BLOCK)
  expect(again).toMatchObject({ playlists: 0, guides: 0, existing: 3 })
  expect(usePlaylists.getState().sources).toHaveLength(2)
})

test('explains the result in sentences', () => {
  expect(summaryText({ playlists: 5, guides: 1, existing: 0, addons: 24, cleartext: 0, notUrl: 0 })).toEqual([
    'Added 5 playlists and 1 guide.',
    'Skipped 24 Stremio addons. ZettaLive plays IPTV playlists only.',
  ])
  expect(summaryText({ playlists: 0, guides: 0, existing: 0, addons: 0, cleartext: 0, notUrl: 0 })).toEqual(['The list has no URLs.'])
})
