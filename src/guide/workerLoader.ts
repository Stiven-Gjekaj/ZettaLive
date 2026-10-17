import type { GuideResult } from './loadGuide'
import { loadGuide } from './loadGuide'
import type { GuideRequest } from './guide.worker'

type Load = (url: string, force: boolean, now: number) => Promise<GuideResult>

/**
 * Loads the guides in one Web Worker. When the worker cannot start, the page
 * loads the guides itself.
 */
export function workerLoader(): Load {
  let worker: Worker | undefined
  let broken = false
  let nextId = 0
  const waiting = new Map<number, (result: GuideResult) => void>()

  const start = (): Worker | undefined => {
    if (worker || broken) return worker
    try {
      worker = new Worker(new URL('./guide.worker.ts', import.meta.url), { type: 'module' })
      worker.onmessage = (event: MessageEvent<{ id: number; result: GuideResult }>) => {
        waiting.get(event.data.id)?.(event.data.result)
        waiting.delete(event.data.id)
      }
      worker.onerror = () => {
        broken = true
        worker?.terminate()
        worker = undefined
        for (const resolve of waiting.values()) resolve({ status: 'failed', error: 'The guide could not be read.' })
        waiting.clear()
      }
    } catch {
      broken = true
    }
    return worker
  }

  return (url, force, now) => {
    const w = start()
    if (!w) return loadGuide(url, { force, now })
    const id = nextId++
    return new Promise((resolve) => {
      waiting.set(id, resolve)
      w.postMessage({ id, url, force, now } satisfies GuideRequest)
    })
  }
}
