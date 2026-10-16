import { create } from 'zustand'
import { del, get, set } from 'idb-keyval'
import { LoadError, fetchText, readFileText } from './fetchText'
import { isM3u, parseM3u, type Channel } from './m3u'
import { xtreamName, xtreamUrls, type XtreamAccount } from './xtream'

/** A playlist that the user added. */
export interface PlaylistSource {
  id: string
  name: string
  /** The URL of a playlist that the app reads again at each start. */
  url?: string
  /** The account of a playlist from an Xtream Codes provider. The URL comes from it. */
  xtream?: XtreamAccount
  addedAt: number
}

/** The result of the last load of a playlist. */
export interface PlaylistResult {
  status: 'loading' | 'ready' | 'failed'
  channels: Channel[]
  guideUrls: string[]
  /** Why the last load failed. A ready playlist with an error shows its saved copy. */
  error?: string
  savedAt?: number
}

interface SavedText {
  text: string
  savedAt: number
}

const SOURCES_KEY = 'playlists'
const textKey = (id: string) => `playlist-text:${id}`

export interface Playlists {
  sources: PlaylistSource[]
  results: Record<string, PlaylistResult>
  started: boolean
  start: () => Promise<void>
  addUrl: (url: string, name?: string) => Promise<void>
  addFile: (file: File) => Promise<void>
  addXtream: (account: XtreamAccount, name?: string) => Promise<void>
  rename: (id: string, name: string) => Promise<void>
  reload: (id: string) => Promise<void>
  remove: (id: string) => Promise<void>
}

/** A name from the URL: the file name, or else the host. */
export function nameFromUrl(url: string): string {
  try {
    const u = new URL(url)
    const file = decodeURIComponent(u.pathname.split('/').pop() ?? '').replace(/\.(m3u8?|txt)$/i, '')
    return file && !/^(get|playlist|index)(\.php)?$/i.test(file) ? file : u.hostname
  } catch {
    return url
  }
}

function parse(text: string, id: string): Pick<PlaylistResult, 'channels' | 'guideUrls'> {
  if (!isM3u(text)) throw new LoadError('The file is not an M3U playlist.')
  return parseM3u(text, id)
}

/** Adds the guide of an Xtream Codes account to the guides of its playlist. */
function withAccountGuide<T extends Pick<PlaylistResult, 'guideUrls'>>(parsed: T, source: PlaylistSource): T {
  if (!source.xtream) return parsed
  const guide = xtreamUrls(source.xtream).guide
  return parsed.guideUrls.includes(guide) ? parsed : { ...parsed, guideUrls: [...parsed.guideUrls, guide] }
}

export function createPlaylists(fetcher: typeof fetch = (...args) => fetch(...args)) {
  return create<Playlists>((setState, getState) => {
    const setResult = (id: string, result: PlaylistResult) =>
      setState((s) => ({ results: { ...s.results, [id]: result } }))

    const saveSources = (sources: PlaylistSource[]) => set(SOURCES_KEY, sources)

    const load = async (source: PlaylistSource) => {
      const saved = await get<SavedText>(textKey(source.id))
      setResult(source.id, {
        status: 'loading',
        channels: getState().results[source.id]?.channels ?? [],
        guideUrls: getState().results[source.id]?.guideUrls ?? [],
      })
      if (!source.url) {
        if (!saved) return setResult(source.id, { status: 'failed', channels: [], guideUrls: [], error: 'The saved file is missing. Add it again.' })
        return setResult(source.id, { status: 'ready', ...parse(saved.text, source.id), savedAt: saved.savedAt })
      }
      try {
        const text = await fetchText(source.url, fetcher)
        const parsed = withAccountGuide(parse(text, source.id), source)
        const savedAt = Date.now()
        await set(textKey(source.id), { text, savedAt } satisfies SavedText)
        setResult(source.id, { status: 'ready', ...parsed, savedAt })
      } catch (e) {
        const error = e instanceof LoadError ? e.message : 'The playlist could not be read.'
        if (saved) setResult(source.id, { status: 'ready', ...withAccountGuide(parse(saved.text, source.id), source), savedAt: saved.savedAt, error })
        else setResult(source.id, { status: 'failed', channels: [], guideUrls: [], error })
      }
    }

    return {
      sources: [],
      results: {},
      started: false,

      async start() {
        if (getState().started) return
        setState({ started: true })
        const sources = (await get<PlaylistSource[]>(SOURCES_KEY)) ?? []
        setState({ sources })
        await Promise.all(sources.map(load))
      },

      async addUrl(url, name) {
        const clean = url.trim()
        const source: PlaylistSource = { id: crypto.randomUUID(), name: name?.trim() || nameFromUrl(clean), url: clean, addedAt: Date.now() }
        const sources = [...getState().sources, source]
        setState({ sources })
        await saveSources(sources)
        await load(source)
      },

      async addFile(file) {
        const source: PlaylistSource = { id: crypto.randomUUID(), name: file.name.replace(/\.(m3u8?|txt)$/i, ''), addedAt: Date.now() }
        let text: string
        try {
          text = await readFileText(file)
          parse(text, source.id)
        } catch (e) {
          throw e instanceof LoadError ? e : new LoadError('The file could not be read.')
        }
        await set(textKey(source.id), { text, savedAt: Date.now() } satisfies SavedText)
        const sources = [...getState().sources, source]
        setState({ sources })
        await saveSources(sources)
        await load(source)
      },

      async addXtream(account, name) {
        const clean = { server: account.server.trim(), username: account.username.trim(), password: account.password }
        const source: PlaylistSource = {
          id: crypto.randomUUID(),
          name: name?.trim() || xtreamName(clean),
          url: xtreamUrls(clean).playlist,
          xtream: clean,
          addedAt: Date.now(),
        }
        const sources = [...getState().sources, source]
        setState({ sources })
        await saveSources(sources)
        await load(source)
      },

      async rename(id, name) {
        const sources = getState().sources.map((s) => (s.id === id ? { ...s, name: name.trim() || s.name } : s))
        setState({ sources })
        await saveSources(sources)
      },

      async reload(id) {
        const source = getState().sources.find((s) => s.id === id)
        if (source) await load(source)
      },

      async remove(id) {
        const sources = getState().sources.filter((s) => s.id !== id)
        setState((s) => {
          const results = { ...s.results }
          delete results[id]
          return { sources, results }
        })
        await saveSources(sources)
        await del(textKey(id))
      },
    }
  })
}

export const usePlaylists = createPlaylists()

/** All channels of all ready playlists, in the order of the playlists. */
export function allChannels(state: Pick<Playlists, 'sources' | 'results'>): Channel[] {
  return state.sources.flatMap((s) => state.results[s.id]?.channels ?? [])
}
