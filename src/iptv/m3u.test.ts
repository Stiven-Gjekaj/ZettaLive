import { isM3u, parseM3u } from './m3u'

const PLAYLIST = [
  '#EXTM3U url-tvg="https://a.example/guide.xml.gz, https://b.example/guide.xml" x-tvg-url="https://b.example/guide.xml"',
  '#EXTINF:-1 tvg-id="news.uk" tvg-name="News UK" tvg-logo="https://logo.example/news.png" group-title="News" tvg-chno="101",News, UK',
  '#EXTVLCOPT:http-user-agent=Mozilla/5.0 (X11)',
  '#EXTVLCOPT:http-referrer=https://site.example/',
  'https://stream.example/news/index.m3u8',
  '',
  '#EXTINF:-1 catchup="append" catchup-days="7" catchup-source="?utc={utc}",Film One',
  '#EXTGRP:Films',
  'https://stream.example/film.ts',
  '#EXTINF:-1,Film One',
  'https://stream.example/film.ts',
].join('\r\n')

test('reads the guide URLs of the header once each', () => {
  expect(parseM3u(PLAYLIST, 'p').guideUrls).toEqual(['https://a.example/guide.xml.gz', 'https://b.example/guide.xml'])
})

test('reads the attributes, the name, and the options of a channel', () => {
  const [news] = parseM3u(PLAYLIST, 'p').channels
  expect(news).toMatchObject({
    playlistId: 'p',
    name: 'News, UK',
    url: 'https://stream.example/news/index.m3u8',
    tvgId: 'news.uk',
    tvgName: 'News UK',
    logo: 'https://logo.example/news.png',
    group: 'News',
    number: 101,
    userAgent: 'Mozilla/5.0 (X11)',
    referrer: 'https://site.example/',
  })
})

test('reads the group from EXTGRP and the catch-up attributes', () => {
  const film = parseM3u(PLAYLIST, 'p').channels[1]
  expect(film).toMatchObject({ name: 'Film One', group: 'Films', catchup: 'append', catchupDays: 7, catchupSource: '?utc={utc}' })
  expect(film?.userAgent).toBeUndefined()
})

test('gives each channel a key that stays the same, also for a duplicate', () => {
  const first = parseM3u(PLAYLIST, 'p').channels.map((c) => c.id)
  const second = parseM3u(PLAYLIST, 'p').channels.map((c) => c.id)
  expect(second).toEqual(first)
  expect(new Set(first).size).toBe(3)
  expect(first.every((id) => id.startsWith('p:'))).toBe(true)
})

test('ignores a URL that has no EXTINF line, and an empty attribute', () => {
  const text = '#EXTM3U\nhttps://lost.example/a.m3u8\n#EXTINF:-1 tvg-logo="",Only\nhttps://only.example/a.m3u8\n'
  const { channels } = parseM3u(text, 'p')
  expect(channels.map((c) => c.name)).toEqual(['Only'])
  expect(channels[0]?.logo).toBeUndefined()
})

test('uses tvg-name, then the URL, when the title is empty', () => {
  const text = '#EXTM3U\n#EXTINF:-1 tvg-name="From tvg",\nhttps://a.example/1\n#EXTINF:-1,\nhttps://a.example/2\n'
  expect(parseM3u(text, 'p').channels.map((c) => c.name)).toEqual(['From tvg', 'https://a.example/2'])
})

test('finds an M3U playlist from its text', () => {
  expect(isM3u('\uFEFF#EXTM3U\n')).toBe(true)
  expect(isM3u('#EXTINF:-1,A\nhttp://a')).toBe(true)
  expect(isM3u('<html><body>Not found</body></html>')).toBe(false)
  expect(isM3u('<?xml version="1.0"?><tv></tv>')).toBe(false)
})
