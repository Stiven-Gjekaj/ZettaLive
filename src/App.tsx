import { Navigation } from './ui/Navigation'
import { useNavigation } from './ui/route'
import { useEffect } from 'react'
import { Placeholder } from './screens/Placeholder'
import { PlaylistsScreen } from './screens/PlaylistsScreen'
import { usePlaylists } from './iptv/playlists'
import './ui/layout.css'
import './ui/controls.css'

/** The root of the interface: the navigation and the open screen. */
export function App() {
  const screen = useNavigation((s) => s.screen)
  useEffect(() => {
    void usePlaylists.getState().start()
  }, [])
  return (
    <div className="app">
      <Navigation />
      <main className="main">
        {screen === 'live' && <Placeholder title="Live TV" text="Your channels show here." />}
        {screen === 'guide' && <Placeholder title="Guide" text="The programmes of your channels show here." />}
        {screen === 'playlists' && <PlaylistsScreen />}
        {screen === 'settings' && <Placeholder title="Settings" text="The settings of the app show here." />}
      </main>
    </div>
  )
}
