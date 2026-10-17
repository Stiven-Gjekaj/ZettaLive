import { create } from 'zustand'
import { del, get, set } from 'idb-keyval'
import { failureKey, guideKey, loadGuide, type GuideResult } from './loadGuide'
import { workerLoader } from './workerLoader'

export { FRESH_MS, FUTURE_MS, MAX_CHARS, PAST_MS, readGuide, type GuideResult } from './loadGuide'

/** A guide URL that the user added. */
export interface GuideSource {
  id: string
  url: string
  addedAt: number
}

/** Gives the result of one guide. */
export type Loader = (url: string, force: boolean, now: number) => Promise<GuideResult>

const SOURCES_KEY = 'guides'

/** The number of guides that load at the same time. A playlist can name many guides. */
export const PARALLEL = 4

export interface Guides {
  sources: GuideSource[]
  results: Record<string, GuideResult>
  start: () => Promise<void>
  /** Loads each URL that is not loaded yet. */
  sync: (urls: readonly string[]) => Promise<void>
  addUrl: (url: string) => Promise<void>
  remove: (id: string) => Promise<void>
  reload: (url: string) => Promise<void>
}

/** The loader of the app: a Web Worker when the browser has one, or else the page itself. */
function defaultLoader(): Loader {
  if (typeof Worker !== 'undefined') return workerLoader()
  return (url, force, now) => loadGuide(url, { force, now })
}

export function createGuides({ loader, clock = Date.now }: { loader?: Loader; clock?: () => number } = {}) {
  let load: Loader | undefined = loader
  return create<Guides>((setState, getState) => {
    const setResult = (url: string, result: GuideResult) => setState((s) => ({ results: { ...s.results, [url]: result } }))

    const run = async (url: string, force: boolean) => {
      load ??= defaultLoader()
      setResult(url, { ...getState().results[url], status: 'loading' })
      setResult(url, await load(url, force, clock()))
    }

    const saveSources = (sources: GuideSource[]) => set(SOURCES_KEY, sources)

    return {
      sources: [],
      results: {},

      async start() {
        const sources = (await get<GuideSource[]>(SOURCES_KEY)) ?? []
        setState({ sources })
        await getState().sync(sources.map((s) => s.url))
      },

      async sync(urls) {
        const todo = [...new Set(urls)].filter((url) => !getState().results[url])
        // Mark all of them first, so that a second sync does not load them again.
        for (const url of todo) setResult(url, { status: 'loading' })
        const next = async (): Promise<void> => {
          const url = todo.shift()
          if (url === undefined) return
          await run(url, false)
          return next()
        }
        await Promise.all(Array.from({ length: Math.min(PARALLEL, todo.length) }, next))
      },

      async addUrl(url) {
        const clean = url.trim()
        if (getState().sources.some((s) => s.url === clean)) return
        const sources = [...getState().sources, { id: crypto.randomUUID(), url: clean, addedAt: clock() }]
        setState({ sources })
        await saveSources(sources)
        await run(clean, true)
      },

      async remove(id) {
        const source = getState().sources.find((s) => s.id === id)
        const sources = getState().sources.filter((s) => s.id !== id)
        setState({ sources })
        await saveSources(sources)
        if (source) await Promise.all([del(guideKey(source.url)), del(failureKey(source.url))])
      },

      reload: (url) => run(url, true),
    }
  })
}

export const useGuides = createGuides()
