import { knownBlock, streamKind } from './stream'

test('finds the kind of a stream from its URL', () => {
  expect(streamKind('https://a.example/live/index.m3u8')).toBe('hls')
  expect(streamKind('https://a.example/play?url=https%3A%2F%2Fb.example%2Fx.m3u8')).toBe('hls')
  expect(streamKind('https://a.example/live/user/pass/123.ts')).toBe('mpegts')
  expect(streamKind('https://a.example/clip.mp4?token=1')).toBe('file')
  expect(streamKind('https://a.example/live/user/pass/123')).toBe('hls')
})

test('knows a cleartext stream on an HTTPS page, and a stream that needs a header', () => {
  const base = { id: 'x', playlistId: 'p', name: 'X' }
  expect(knownBlock({ ...base, url: 'http://a.example/x.m3u8' }, 'https:')).toBe('cleartext')
  expect(knownBlock({ ...base, url: 'http://a.example/x.m3u8' }, 'http:')).toBeUndefined()
  expect(knownBlock({ ...base, url: 'https://a.example/x.m3u8', referrer: 'https://site.example/' }, 'https:')).toBe('header')
  expect(knownBlock({ ...base, url: 'https://a.example/x.m3u8', userAgent: 'VLC' }, 'https:')).toBe('header')
  expect(knownBlock({ ...base, url: 'https://a.example/x.m3u8' }, 'https:')).toBeUndefined()
})
