import { useProfiles } from '../library/profiles'
import { Avatar } from '../ui/Avatar'

/** "Who is watching?" It shows at the start when there is more than one profile. */
export function ProfilePicker() {
  const profiles = useProfiles((s) => s.profiles)
  const picked = useProfiles((s) => s.picked)
  if (picked) return null
  return (
    <div className="picker" role="dialog" aria-label="Who is watching?">
      <h1>Who is watching?</h1>
      <ul className="picker-list plain-list">
        {profiles.map((p) => (
          <li key={p.id}>
            <button type="button" className="picker-item" onClick={() => void useProfiles.getState().choose(p.id)}>
              <Avatar n={p.avatar} size={96} />
              <span>{p.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
