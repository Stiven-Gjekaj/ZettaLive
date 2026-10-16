import { useRef, useState, type FormEvent } from 'react'
import { BackupError, backupFileName, makeBackup, readBackup, restoreBackup } from '../library/backup'
import { useProfiles, type Profile } from '../library/profiles'
import { useSettings } from '../library/settings'
import { AVATARS, Avatar } from '../ui/Avatar'

function AvatarChoice({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="row" role="radiogroup" aria-label="Picture">
      {Array.from({ length: AVATARS }, (_, n) => (
        <button key={n} type="button" role="radio" aria-checked={n === value} aria-label={`Picture ${n + 1}`} className="avatar-choice" onClick={() => onChange(n)}>
          <Avatar n={n} size={40} />
        </button>
      ))}
    </div>
  )
}

function ProfileRow({ profile, active, only }: { profile: Profile; active: boolean; only: boolean }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(profile.name)
  const [avatar, setAvatar] = useState(profile.avatar)
  const { choose, edit, remove } = useProfiles.getState()

  const save = (e: FormEvent) => {
    e.preventDefault()
    void edit(profile.id, { name, avatar })
    setEditing(false)
  }

  return (
    <li className="card stack" aria-label={profile.name}>
      <div className="row">
        <Avatar n={profile.avatar} size={44} />
        <strong className="grow">{profile.name}</strong>
        {active ? (
          <span className="dim">In use</span>
        ) : (
          <button type="button" className="button button-small button-primary" onClick={() => void choose(profile.id)}>
            Use
          </button>
        )}
        <button type="button" className="button button-small" onClick={() => setEditing(!editing)}>
          Edit
        </button>
        {!only && (
          <button
            type="button"
            className="button button-small"
            onClick={() => {
              if (window.confirm(`Remove the profile "${profile.name}" with its favourites and settings?`)) void remove(profile.id)
            }}
          >
            Remove
          </button>
        )}
      </div>
      {editing && (
        <form className="stack" onSubmit={save}>
          <input className="input" aria-label="Profile name" value={name} onChange={(e) => setName(e.target.value)} />
          <AvatarChoice value={avatar} onChange={setAvatar} />
          <div className="row">
            <button type="submit" className="button button-small button-primary">
              Save
            </button>
          </div>
        </form>
      )}
    </li>
  )
}

function Profiles() {
  const profiles = useProfiles((s) => s.profiles)
  const activeId = useProfiles((s) => s.activeId)
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState(1)

  const add = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    void useProfiles.getState().add(name, avatar)
    setName('')
  }

  return (
    <>
      <h2 className="list-title">Profiles</h2>
      <p className="dim">Each profile has its own favourites, recent channels, and settings.</p>
      <ul className="stack plain-list list-gap">
        {profiles.map((p) => (
          <ProfileRow key={p.id} profile={p} active={p.id === activeId} only={profiles.length === 1} />
        ))}
      </ul>
      <form className="card stack list-gap" onSubmit={add}>
        <label htmlFor="new-profile">Add a profile</label>
        <div className="row">
          <input id="new-profile" className="input grow" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <button type="submit" className="button button-primary" disabled={!name.trim()}>
            Add profile
          </button>
        </div>
        <AvatarChoice value={avatar} onChange={setAvatar} />
      </form>
    </>
  )
}

function Viewing() {
  const hideBlocked = useSettings((s) => s.hideBlocked)
  const startScreen = useSettings((s) => s.startScreen)
  const change = useSettings((s) => s.change)
  return (
    <>
      <h2 className="list-title">Viewing</h2>
      <div className="card stack">
        <label className="row">
          <input type="checkbox" checked={hideBlocked} onChange={(e) => change({ hideBlocked: e.target.checked })} />
          Hide the channels that cannot play in a browser
        </label>
        <label className="row">
          <span className="grow">Screen at the start</span>
          <select className="input" value={startScreen} onChange={(e) => change({ startScreen: e.target.value === 'guide' ? 'guide' : 'live' })}>
            <option value="live">Live TV</option>
            <option value="guide">Guide</option>
          </select>
        </label>
      </div>
    </>
  )
}

function BackupSection() {
  const file = useRef<HTMLInputElement>(null)
  const [problem, setProblem] = useState('')

  const save = async () => {
    const backup = await makeBackup()
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = backupFileName()
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const restore = async (chosen: File | undefined) => {
    if (!chosen) return
    try {
      const backup = readBackup(await chosen.text())
      if (!window.confirm('Restore this backup? It replaces your playlists, guides, profiles, and settings.')) return
      await restoreBackup(backup)
      window.location.reload()
    } catch (e) {
      setProblem(e instanceof BackupError ? e.message : 'The file could not be read.')
    } finally {
      if (file.current) file.current.value = ''
    }
  }

  return (
    <>
      <h2 className="list-title">Backup</h2>
      <div className="card stack">
        <p className="dim">A backup file holds your playlists, guides, profiles, favourites, and settings. Use it to move them to a different device.</p>
        <div className="row">
          <button type="button" className="button" onClick={() => void save()}>
            Save a backup file
          </button>
          <button type="button" className="button" onClick={() => file.current?.click()}>
            Restore a backup file
          </button>
          <input ref={file} className="visually-hidden" type="file" aria-label="Backup file" accept=".json,application/json" onChange={(e) => void restore(e.target.files?.[0])} />
        </div>
        {problem && (
          <p className="error" role="alert">
            {problem}
          </p>
        )}
      </div>
    </>
  )
}

/** The profiles, the viewing settings, the backup, and the version. */
export function SettingsScreen() {
  return (
    <section className="settings">
      <h1 className="screen-title">Settings</h1>
      <Profiles />
      <Viewing />
      <BackupSection />
      <h2 className="list-title">About</h2>
      <p className="dim">
        ZettaLive {__APP_VERSION__}.{' '}
        <a href="https://github.com/Stiven-Gjekaj/ZettaLive" target="_blank" rel="noreferrer">
          Source code
        </a>
      </p>
    </section>
  )
}
