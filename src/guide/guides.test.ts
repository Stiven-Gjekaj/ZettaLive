import { clear } from 'idb-keyval'
import { FRESH_MS, createGuides } from './guides'

const NOW = Date.parse('2026-10-17T10:00:00Z')

const GUIDE = `<tv>
<channel id="a"><display-name>A</display-name></channel>
<programme start="20261017093000 +0000" stop="20261017103000 +0000" channel="a"><title>Now</title></programme>
<programme start="20261010093000 +0000" stop="20261010103000 +0000" channel="a"><title>Last week</title></programme>
<programme start="20261025093000 +0000" stop="20261025103000 +0000" channel="a"><title>Next week</title></programme>
</tv>`

function server(answers: Record<string, string | number>, calls: string[] = []) {
  return (async (input: RequestInfo | URL) => {
    calls.push(String(input))
    const answer = answers[String(input)]
    if (answer === undefined) throw new TypeError('Failed to fetch')
    return typeof answer === 'number' ? new Response('', { status: answer }) : new Response(answer)
  }) as typeof fetch
}

beforeEach(() => clear())

test('loads a guide and keeps only the programmes near now', async () => {
  const guides = createGuides(server({ 'https://g.example/a.xml': GUIDE }), () => NOW)
  await guides.getState().sync(['https://g.example/a.xml'])
  const result = guides.getState().results['https://g.example/a.xml']
  expect(result?.status).toBe('ready')
  expect(result?.guide?.programmes['a']?.map((p) => p.title)).toEqual(['Now'])
})

test('uses a fresh saved guide, and loads an old one again', async () => {
  const calls: string[] = []
  await createGuides(server({ 'https://g.example/a.xml': GUIDE }, calls), () => NOW).getState().sync(['https://g.example/a.xml'])
  await createGuides(server({ 'https://g.example/a.xml': GUIDE }, calls), () => NOW + 1000).getState().sync(['https://g.example/a.xml'])
  expect(calls).toHaveLength(1)
  const late = createGuides(server({ 'https://g.example/a.xml': 500 }, calls), () => NOW + FRESH_MS + 1)
  await late.getState().sync(['https://g.example/a.xml'])
  expect(calls).toHaveLength(2)
  expect(late.getState().results['https://g.example/a.xml']).toMatchObject({ status: 'ready', error: 'The server answered with the error 500.', savedAt: NOW })
})

test('refuses a file that is not a guide', async () => {
  const guides = createGuides(server({ 'https://g.example/page': '<html></html>' }), () => NOW)
  await guides.getState().sync(['https://g.example/page'])
  expect(guides.getState().results['https://g.example/page']).toEqual({ status: 'failed', error: 'The file is not an XMLTV guide.' })
})

test('adds and removes a guide of the user, also for the next start', async () => {
  const guides = createGuides(server({ 'https://g.example/a.xml': GUIDE, 'https://g.example/b.xml': GUIDE }), () => NOW)
  await guides.getState().addUrl('https://g.example/a.xml')
  await guides.getState().addUrl('https://g.example/b.xml')
  await guides.getState().addUrl('https://g.example/a.xml')
  await guides.getState().remove(guides.getState().sources[0]!.id)
  const next = createGuides(server({ 'https://g.example/b.xml': GUIDE }), () => NOW)
  await next.getState().start()
  expect(next.getState().sources.map((s) => s.url)).toEqual(['https://g.example/b.xml'])
  expect(next.getState().results['https://g.example/b.xml']?.status).toBe('ready')
})
