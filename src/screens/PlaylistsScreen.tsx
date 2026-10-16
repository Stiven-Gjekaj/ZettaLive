import { useRef, useState, type FormEvent } from 'react'
import { LoadError, isBlockedCleartext } from '../iptv/fetchText'
import { usePlaylists, type PlaylistResult, type PlaylistSource } from '../iptv/playlists'
import { useGuides, type GuideResult } from '../guide/guides'
import { useGuideUrls } from '../guide/useGuide'

function time(ms: number | undefined): string {
  return ms ? new Date(ms).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : ''
}

function status(result: PlaylistResult | undefined): string {
  if (!result || result.status === 'loading') return 'Loading...'
  if (result.status === 'failed') return 'Not loaded'
  const count = `${result.channels.length} ${result.channels.length === 1 ? 'channel' : 'channels'}`
  return result.error ? `${count}, from the copy of ${time(result.savedAt)}` : `${count}, updated ${time(result.savedAt)}`
}

function PlaylistCard({ source }: { source: PlaylistSource }) {
  const result = usePlaylists((s) => s.results[source.id])
  const { reload, rename, remove } = usePlaylists.getState()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(source.name)

  const save = (e: FormEvent) => {
    e.preventDefault()
    void rename(source.id, name)
    setEditing(false)
  }

  return (
    <li className="card stack" aria-label={source.name}>
      {editing ? (
        <form className="row" onSubmit={save}>
          <label className="visually-hidden" htmlFor={`name-${source.id}`}>
            Name
          </label>
          <input id={`name-${source.id}`} className="input grow" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <button className="button button-small button-primary" type="submit">
            Save
          </button>
        </form>
      ) : (
        <h2>{source.name}</h2>
      )}
      <p className="dim">{source.url ?? 'From a file'}</p>
      <p>{status(result)}</p>
      {result?.error && <p className="error">{result.error}</p>}
      <div className="row">
        {source.url && (
          <button className="button button-small" type="button" disabled={result?.status === 'loading'} onClick={() => void reload(source.id)}>
            Load again
          </button>
        )}
        <button className="button button-small" type="button" onClick={() => setEditing(!editing)}>
          Rename
        </button>
        <button
          className="button button-small"
          type="button"
          onClick={() => {
            if (window.confirm(`Remove the playlist "${source.name}"?`)) void remove(source.id)
          }}
        >
          Remove
        </button>
      </div>
    </li>
  )
}

function guideStatus(result: GuideResult | undefined): string {
  if (!result || result.status === 'loading') return 'Loading...'
  if (result.status === 'failed' || !result.guide) return 'Not loaded'
  const count = Object.keys(result.guide.programmes).length
  const text = `${count} ${count === 1 ? 'channel' : 'channels'} with programmes`
  return result.error ? `${text}, from the copy of ${time(result.savedAt)}` : `${text}, updated ${time(result.savedAt)}`
}

/** The guides of the playlists and the guides that the user added. */
function GuidesSection() {
  const urls = useGuideUrls()
  const own = useGuides((s) => s.sources)
  const results = useGuides((s) => s.results)
  const [url, setUrl] = useState('')
  const [problem, setProblem] = useState('')

  const add = (e: FormEvent) => {
    e.preventDefault()
    const clean = url.trim()
    if (!/^https?:\/\/\S+$/i.test(clean)) return setProblem('Type a URL that starts with https://.')
    if (isBlockedCleartext(clean)) return setProblem('The URL starts with http://. A browser cannot load it from an HTTPS page. Use an https:// URL.')
    setProblem('')
    setUrl('')
    void useGuides.getState().addUrl(clean)
  }

  return (
    <>
      <h2 className="list-title">Guides</h2>
      <form className="card stack" onSubmit={add} noValidate>
        <label htmlFor="guide-url">Add an XMLTV guide from a URL</label>
        <div className="row">
          <input
            id="guide-url"
            className="input grow"
            type="url"
            inputMode="url"
            placeholder="https://example.com/guide.xml.gz"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button className="button button-primary" type="submit">
            Add guide
          </button>
        </div>
        {problem && (
          <p className="error" role="alert">
            {problem}
          </p>
        )}
      </form>
      {urls.length === 0 ? (
        <p className="dim list-gap">You have no guides. A playlist can also name its guide.</p>
      ) : (
        <ul className="stack plain-list list-gap">
          {urls.map((u) => {
            const mine = own.find((s) => s.url === u)
            const result = results[u]
            return (
              <li key={u} className="card stack" aria-label={u}>
                <p className="dim">{u}</p>
                <p>
                  {guideStatus(result)}
                  {!mine && <span className="dim"> (named by a playlist)</span>}
                </p>
                {result?.error && <p className="error">{result.error}</p>}
                <div className="row">
                  <button className="button button-small" type="button" disabled={result?.status === 'loading'} onClick={() => void useGuides.getState().reload(u)}>
                    Load again
                  </button>
                  {mine && (
                    <button className="button button-small" type="button" onClick={() => void useGuides.getState().remove(mine.id)}>
                      Remove
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}

/** The user adds, loads again, renames, and removes playlists here. */
export function PlaylistsScreen() {
  const sources = usePlaylists((s) => s.sources)
  const [url, setUrl] = useState('')
  const [name, setName] = useState('')
  const [problem, setProblem] = useState('')
  const file = useRef<HTMLInputElement>(null)

  const addUrl = (e: FormEvent) => {
    e.preventDefault()
    const clean = url.trim()
    if (!/^https?:\/\/\S+$/i.test(clean)) return setProblem('Type a URL that starts with https://.')
    if (isBlockedCleartext(clean)) return setProblem('The URL starts with http://. A browser cannot load it from an HTTPS page. Use an https:// URL.')
    setProblem('')
    setUrl('')
    setName('')
    void usePlaylists.getState().addUrl(clean, name)
  }

  const addFile = async (chosen: File | undefined) => {
    if (!chosen) return
    try {
      setProblem('')
      await usePlaylists.getState().addFile(chosen)
    } catch (e) {
      setProblem(e instanceof LoadError ? e.message : 'The file could not be read.')
    } finally {
      if (file.current) file.current.value = ''
    }
  }

  return (
    <section>
      <h1 className="screen-title">Playlists</h1>
      <div className="card stack">
        <form className="stack" onSubmit={addUrl} noValidate>
          <label htmlFor="playlist-url">Add a playlist from a URL</label>
          <div className="row">
            <input
              id="playlist-url"
              className="input grow"
              type="url"
              inputMode="url"
              placeholder="https://example.com/playlist.m3u"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <input className="input" aria-label="Name (optional)" placeholder="Name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
            <button className="button button-primary" type="submit">
              Add
            </button>
          </div>
        </form>
        <div className="row">
          <span className="dim">Or</span>
          <button className="button" type="button" onClick={() => file.current?.click()}>
            Add a file
          </button>
          <input
            ref={file}
            className="visually-hidden"
            type="file"
            aria-label="Playlist file"
            accept=".m3u,.m3u8,.txt,.gz,audio/x-mpegurl,application/x-mpegurl"
            onChange={(e) => void addFile(e.target.files?.[0])}
          />
        </div>
        {problem && (
          <p className="error" role="alert">
            {problem}
          </p>
        )}
      </div>
      <h2 className="list-title">Your playlists</h2>
      {sources.length === 0 ? (
        <p className="dim">You have no playlists. Add one above.</p>
      ) : (
        <ul className="stack plain-list">
          {sources.map((s) => (
            <PlaylistCard key={s.id} source={s} />
          ))}
        </ul>
      )}
      <GuidesSection />
    </section>
  )
}
