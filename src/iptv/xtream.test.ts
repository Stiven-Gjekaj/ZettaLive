import { cleanServer, xtreamName, xtreamUrls } from './xtream'

test('cleans the server address', () => {
  expect(cleanServer(' provider.example:8080/ ')).toBe('https://provider.example:8080')
  expect(cleanServer('http://provider.example')).toBe('http://provider.example')
})

test('builds the playlist URL and the guide URL of an account', () => {
  expect(xtreamUrls({ server: 'provider.example:8080', username: 'me', password: 'p&ss word' })).toEqual({
    playlist: 'https://provider.example:8080/get.php?username=me&password=p%26ss%20word&type=m3u_plus&output=m3u8',
    guide: 'https://provider.example:8080/xmltv.php?username=me&password=p%26ss%20word',
  })
})

test('names the account by the host of its server', () => {
  expect(xtreamName({ server: 'https://provider.example:8080/', username: 'a', password: 'b' })).toBe('provider.example:8080')
})
