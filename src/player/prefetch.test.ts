import { prefetchPlayer } from './prefetch'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

test('loads the player when the browser is idle', () => {
  let idle: (() => void) | undefined
  vi.stubGlobal('requestIdleCallback', (fn: () => void) => (idle = fn))
  const load = vi.fn(async () => ({}))
  prefetchPlayer(load)
  expect(load).not.toHaveBeenCalled()
  idle?.()
  expect(load).toHaveBeenCalledTimes(1)
})

test('does nothing when the user saves data', () => {
  vi.stubGlobal('navigator', { connection: { saveData: true } })
  vi.useFakeTimers()
  const load = vi.fn(async () => ({}))
  prefetchPlayer(load)
  vi.runAllTimers()
  expect(load).not.toHaveBeenCalled()
})
