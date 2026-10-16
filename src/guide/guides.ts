import { create } from 'zustand'
import { del, get, set } from 'idb-keyval'
import { LoadError, fetchText } from '../iptv/fetchText'
import { parseXmltv, type Guide } from './xmltv'

/** A guide URL that the user added. */
export interface GuideSource {
  id: string
  url: string
  addedAt: number
}

export interface GuideResult {
  status: 'loading' | 'ready' | 'failed'
  guide?: Guide
  error?: string
  savedAt?: number
}

interface SavedGuide {
  guide: Guide
  savedAt: number
}

const SOURCES_KEY = 'guides'
const guideKey = (url: string) => `guide:${url}`

/** A saved guide younger than this does not load again at a start. */
export const FRESH_MS = 6 * 3600_000
/** The app keeps the programmes from this time before now. */
export const PAST_MS = 3 * 3600_000
/** The app keeps the programmes until this time after now. */
export const FUTURE_MS = 36 * 3600_000
/** A guide file larger than this is too large for a browser. */
export const MAX_CHARS = 150_000_000

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

export function readGuide(text: string, now: number): Guide {
  if (text.length > MAX_CHARS) throw new LoadError('The guide is too large for a browser.')
  if (!/<tv[\s>]/i.test(text.slice(0, 4096))) throw new LoadError('The file is not an XMLTV guide.')
  return parseXmltv(text, { from: now - PAST_MS, to: now + FUTURE_MS })
}

export function createGuides(fetcher: typeof fetch = (...args) => fetch(...args), clock: () => number = Date.now) {
  return create<Guides>((setState, getState) => {
    const setResult = (url: string, result: GuideResult) => setState((s) => ({ results: { ...s.results, [url]: result } }))

    const load = async (url: string, force: boolean) => {
      const saved = await get<SavedGuide>(guideKey(url))
      const now = clock()
      if (saved && !force && now - saved.savedAt < FRESH_MS) {
        return setResult(url, { status: 'ready', guide: saved.guide, savedAt: saved.savedAt })
      }
      setResult(url, { ...getState().results[url], status: 'loading' })
      try {
        const guide = readGuide(await fetchText(url, fetcher), now)
        await set(guideKey(url), { guide, savedAt: now } satisfies SavedGuide)
        setResult(url, { status: 'ready', guide, savedAt: now })
      } catch (e) {
        const error = e instanceof LoadError ? e.message : 'The guide could not be read.'
        setResult(url, saved ? { status: 'ready', guide: saved.guide, savedAt: saved.savedAt, error } : { status: 'failed', error })
      }
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
        await Promise.all(todo.map((url) => load(url, false)))
      },

      async addUrl(url) {
        const clean = url.trim()
        if (getState().sources.some((s) => s.url === clean)) return
        const sources = [...getState().sources, { id: crypto.randomUUID(), url: clean, addedAt: clock() }]
        setState({ sources })
        await saveSources(sources)
        await load(clean, true)
      },

      async remove(id) {
        const source = getState().sources.find((s) => s.id === id)
        const sources = getState().sources.filter((s) => s.id !== id)
        setState({ sources })
        await saveSources(sources)
        if (source) await del(guideKey(source.url))
      },

      reload: (url) => load(url, true),
    }
  })
}

export const useGuides = createGuides()
