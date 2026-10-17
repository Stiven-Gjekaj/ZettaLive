import { useEffect } from 'react'
import { useGuides } from './guide/guides'
import { useGuideSync } from './guide/useGuide'
import { usePlaylists } from './iptv/playlists'
import { useProfiles } from './library/profiles'
import { useSettings } from './library/settings'
import { PlayerView } from './player/PlayerView'
import { prefetchPlayer } from './player/prefetch'
import { GuideScreen } from './screens/GuideScreen'
import { LiveScreen } from './screens/LiveScreen'
import { PlaylistsScreen } from './screens/PlaylistsScreen'
import { ProfilePicker } from './screens/ProfilePicker'
import { SettingsScreen } from './screens/SettingsScreen'
import { Navigation } from './ui/Navigation'
import { useNavigation } from './ui/route'
import './ui/layout.css'
import './ui/controls.css'
import './screens/live.css'
import './screens/guide.css'
import './player/player.css'
import './screens/settings.css'

/** The root of the interface: the navigation and the open screen. */
export function App() {
  const screen = useNavigation((s) => s.screen)
  useEffect(() => {
    void usePlaylists.getState().start()
    void useGuides.getState().start()
    prefetchPlayer()
    // Open the start screen of the profile once its settings are loaded.
    void useProfiles
      .getState()
      .start()
      .then(() => useNavigation.getState().open(useSettings.getState().startScreen))
  }, [])
  useGuideSync()
  return (
    <div className="app">
      <Navigation />
      <main className="main">
        {screen === 'live' && <LiveScreen />}
        {screen === 'guide' && <GuideScreen />}
        {screen === 'playlists' && <PlaylistsScreen />}
        {screen === 'settings' && <SettingsScreen />}
      </main>
      <PlayerView />
      <ProfilePicker />
    </div>
  )
}
