import { lineKind, sortLines } from './sourceList'

test('finds the kind of a URL from its shape', () => {
  expect(lineKind('https://iptv-org.github.io/iptv/countries/al.m3u', 'https:')).toBe('playlist')
  expect(lineKind('https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8', 'https:')).toBe('playlist')
  expect(lineKind('https://tv.example/get.php?username=a&password=b&type=m3u_plus', 'https:')).toBe('playlist')
  expect(lineKind('https://raw.githubusercontent.com/doms9/iptv/refs/heads/default/M3U8/TV.xml', 'https:')).toBe('guide')
  expect(lineKind('https://epg.pw/xmltv/epg_GB.xml.gz', 'https:')).toBe('guide')
  expect(lineKind('https://tv.example/xmltv.php?username=a&password=b', 'https:')).toBe('guide')
  expect(lineKind('https://v3-cinemeta.strem.io/manifest.json', 'https:')).toBe('addon')
  expect(lineKind('http://tv.example/list.m3u', 'https:')).toBe('cleartext')
  expect(lineKind('my list', 'https:')).toBe('not-url')
})

test('sorts a pasted block, with notes, empty lines, and copies', () => {
  const block = [
    '# IPTV playlists, Albania first',
    'https://iptv-org.github.io/iptv/countries/al.m3u',
    '',
    '  https://iptv-org.github.io/iptv/countries/al.m3u  ',
    '# TV guide',
    'https://raw.githubusercontent.com/doms9/iptv/refs/heads/default/M3U8/TV.xml',
    'https://v3-cinemeta.strem.io/manifest.json',
  ].join('\r\n')
  expect(sortLines(block, 'https:')).toEqual([
    { url: 'https://iptv-org.github.io/iptv/countries/al.m3u', kind: 'playlist' },
    { url: 'https://raw.githubusercontent.com/doms9/iptv/refs/heads/default/M3U8/TV.xml', kind: 'guide' },
    { url: 'https://v3-cinemeta.strem.io/manifest.json', kind: 'addon' },
  ])
})
