import { LoadError, fetchText, isBlockedCleartext, readFileText } from './fetchText'

const ok = (body: BodyInit) => (async () => new Response(body)) as typeof fetch

async function gzip(text: string): Promise<Uint8Array> {
  const body = new Response(text).body
  if (!body) throw new Error('No body.')
  return new Uint8Array(await new Response(body.pipeThrough(new CompressionStream('gzip'))).arrayBuffer())
}

test('reads plain text', async () => {
  expect(await fetchText('https://a.example/list.m3u', ok('#EXTM3U\n'))).toBe('#EXTM3U\n')
})

test('unzips a gzip file', async () => {
  const zipped = await gzip('<tv></tv>')
  expect(zipped[0]).toBe(0x1f)
  expect(await fetchText('https://a.example/guide.xml.gz', ok(zipped as BodyInit))).toBe('<tv></tv>')
  expect(await readFileText(new Blob([zipped as BlobPart]))).toBe('<tv></tv>')
})

test('gives the status of a failed answer', async () => {
  const notFound = (async () => new Response('no', { status: 404 })) as typeof fetch
  await expect(fetchText('https://a.example/x', notFound)).rejects.toThrow('error 404')
})

test('explains a network or CORS failure', async () => {
  const fail = (async () => {
    throw new TypeError('Failed to fetch')
  }) as typeof fetch
  await expect(fetchText('https://a.example/x', fail)).rejects.toBeInstanceOf(LoadError)
  await expect(fetchText('https://a.example/x', fail)).rejects.toThrow('CORS')
})

test('finds a cleartext URL that an HTTPS page cannot load', () => {
  expect(isBlockedCleartext('http://a.example/x', 'https:')).toBe(true)
  expect(isBlockedCleartext(' HTTP://a.example/x', 'https:')).toBe(true)
  expect(isBlockedCleartext('https://a.example/x', 'https:')).toBe(false)
  expect(isBlockedCleartext('http://a.example/x', 'http:')).toBe(false)
})
