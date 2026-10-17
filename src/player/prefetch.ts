/**
 * Loads the HLS player in the background after the app starts, so that the
 * first channel does not wait for it. It waits until the browser is idle, and
 * it does nothing when the user saves data.
 */
export function prefetchPlayer(load: () => Promise<unknown> = () => import('hls.js')): void {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
  if (connection?.saveData) return
  const run = () => void load().catch(() => {})
  if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 5000 })
  else setTimeout(run, 2000)
}
