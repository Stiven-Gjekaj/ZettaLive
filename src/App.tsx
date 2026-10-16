import { useEffect } from 'react'
import { useGuides } from './guide/guides'
import { useGuideSync } from './guide/useGuide'
import { usePlaylists } from './iptv/playlists'
import { useLibrary } from './library/library'
import { PlayerView } from './player/PlayerView'
import { GuideScreen } from './screens/GuideScreen'
import { LiveScreen } from './screens/LiveScreen'
import { Placeholder } from './screens/Placeholder'
import { PlaylistsScreen } from './screens/PlaylistsScreen'
import { Navigation } from './ui/Navigation'
import { useNavigation } from './ui/route'
import './ui/layout.css'
import './ui/controls.css'
import './screens/live.css'
import './screens/guide.css'
import './player/player.css'

/** The root of the interface: the navigation and the open screen. */
export function App() {
  const screen = useNavigation((s) => s.screen)
  useEffect(() => {
    void usePlaylists.getState().start()
    void useLibrary.getState().load('default')
    void useGuides.getState().start()
  }, [])
  useGuideSync()
  return (
    <div className="app">
      <Navigation />
      <main className="main">
        {screen === 'live' && <LiveScreen />}
        {screen === 'guide' && <GuideScreen />}
        {screen === 'playlists' && <PlaylistsScreen />}
        {screen === 'settings' && <Placeholder title="Settings" text="The settings of the app show here." />}
      </main>
      <PlayerView />
    </div>
  )
}
