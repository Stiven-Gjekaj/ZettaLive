/// <reference lib="webworker" />
import { loadGuide } from './loadGuide'

/** A request of the page. */
export interface GuideRequest {
  id: number
  url: string
  force: boolean
  now: number
}

const scope = self as unknown as DedicatedWorkerGlobalScope

// The worker reads, parses, and saves the guides, so that the page stays smooth.
scope.onmessage = async (event: MessageEvent<GuideRequest>) => {
  const { id, url, force, now } = event.data
  const result = await loadGuide(url, { force, now })
  scope.postMessage({ id, result })
}
