import { del, get, set } from 'idb-keyval'
import { LoadError, fetchText } from '../iptv/fetchText'
import { parseXmltv, type Guide } from './xmltv'

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

/** The last failure of a guide. */
interface Failure {
  at: number
  error: string
}

export const guideKey = (url: string) => `guide:${url}`
export const failureKey = (url: string) => `guide-failed:${url}`

/** A saved guide younger than this does not load again at a start. A failed guide waits this long too. */
export const FRESH_MS = 6 * 3600_000
/** The app keeps the programmes from this time before now. */
export const PAST_MS = 3 * 3600_000
/** The app keeps the programmes until this time after now. */
export const FUTURE_MS = 36 * 3600_000
/** A guide file larger than this is too large for a browser. */
export const MAX_CHARS = 150_000_000

export function readGuide(text: string, now: number): Guide {
  if (text.length > MAX_CHARS) throw new LoadError('The guide is too large for a browser.')
  if (!/<tv[\s>]/i.test(text.slice(0, 4096))) throw new LoadError('The file is not an XMLTV guide.')
  return parseXmltv(text, { from: now - PAST_MS, to: now + FUTURE_MS })
}

export interface LoadOptions {
  /** Load from the network also when the saved copy is fresh or the last load failed. */
  force: boolean
  now: number
  fetcher?: typeof fetch
}

/**
 * Gives a guide: the fresh saved copy, or else the guide from the network.
 * It saves each guide that it reads, and each failure. A Web Worker runs it,
 * so that a large guide does not stop the page.
 */
export async function loadGuide(url: string, { force, now, fetcher = (...args) => fetch(...args) }: LoadOptions): Promise<GuideResult> {
  const saved = await get<SavedGuide>(guideKey(url))
  const failed = (error: string): GuideResult =>
    saved ? { status: 'ready', guide: saved.guide, savedAt: saved.savedAt, error } : { status: 'failed', error }
  if (saved && !force && now - saved.savedAt < FRESH_MS) return { status: 'ready', guide: saved.guide, savedAt: saved.savedAt }
  // A guide that failed a short time ago does not load again at a start.
  const failure = force ? undefined : await get<Failure>(failureKey(url))
  if (failure && now - failure.at < FRESH_MS) return failed(failure.error)
  try {
    const guide = readGuide(await fetchText(url, fetcher), now)
    await set(guideKey(url), { guide, savedAt: now } satisfies SavedGuide)
    await del(failureKey(url))
    return { status: 'ready', guide, savedAt: now }
  } catch (e) {
    const error = e instanceof LoadError ? e.message : 'The guide could not be read.'
    await set(failureKey(url), { at: now, error } satisfies Failure)
    return failed(error)
  }
}
