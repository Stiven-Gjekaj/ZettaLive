import { clear } from 'idb-keyval'
import { workerLoader } from './workerLoader'

afterEach(async () => {
  vi.unstubAllGlobals()
  await clear()
})

test('sends each request to the worker and gives back its answer', async () => {
  const sent: unknown[] = []
  class FakeWorker {
    onmessage: ((e: MessageEvent) => void) | null = null
    onerror: (() => void) | null = null
    postMessage(data: { id: number; url: string }) {
      sent.push(data)
      queueMicrotask(() => this.onmessage?.({ data: { id: data.id, result: { status: 'failed', error: data.url } } } as MessageEvent))
    }
    terminate() {}
  }
  vi.stubGlobal('Worker', FakeWorker)
  const load = workerLoader()
  const [a, b] = await Promise.all([load('https://g.example/a.xml', false, 1), load('https://g.example/b.xml', true, 2)])
  expect(a).toEqual({ status: 'failed', error: 'https://g.example/a.xml' })
  expect(b).toEqual({ status: 'failed', error: 'https://g.example/b.xml' })
  expect(sent).toEqual([
    { id: 0, url: 'https://g.example/a.xml', force: false, now: 1 },
    { id: 1, url: 'https://g.example/b.xml', force: true, now: 2 },
  ])
})

test('loads the guide in the page when the worker cannot start', async () => {
  vi.stubGlobal(
    'Worker',
    class {
      constructor() {
        throw new Error('No workers here.')
      }
    },
  )
  vi.stubGlobal('fetch', async () => new Response('<tv><channel id="a"><display-name>A</display-name></channel></tv>'))
  const result = await workerLoader()('https://g.example/a.xml', true, Date.now())
  expect(result.status).toBe('ready')
  expect(result.guide?.channels[0]?.id).toBe('a')
})
