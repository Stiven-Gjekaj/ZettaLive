import { Icon } from './Icon'
import { SCREENS, useNavigation } from './route'

/**
 * The icon bar at the left of a desktop screen. On a phone, the same bar is a
 * tab bar at the bottom. The CSS chooses the form from the width.
 */
export function Navigation() {
  const screen = useNavigation((s) => s.screen)
  const open = useNavigation((s) => s.open)
  return (
    <nav className="nav" aria-label="Screens">
      {SCREENS.map((item) => (
        <button
          key={item.id}
          type="button"
          className="nav-item"
          aria-current={item.id === screen ? 'page' : undefined}
          title={item.label}
          onClick={() => open(item.id)}
        >
          <Icon screen={item.id} />
          <span className="nav-label">{item.label}</span>
        </button>
      ))}
    </nav>
  )
}
