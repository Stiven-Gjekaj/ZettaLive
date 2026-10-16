import type { EngineEvents } from './engine'
import { startEngine } from './engine'

const hlsMade: { attached: boolean }[] = []

vi.mock('hls.js', () => {
  class Hls {
    static isSupported = () => true
    static Events = { ERROR: 'e', MANIFEST_PARSED: 'm', AUDIO_TRACKS_UPDATED: 'a', AUDIO_TRACK_SWITCHED: 's', LEVEL_SWITCHED: 'l' }
    static ErrorTypes = { MEDIA_ERROR: 'media', NETWORK_ERROR: 'network' }
    static ErrorDetails = { MANIFEST_PARSING_ERROR: 'parse' }
    record = { attached: false }
    audioTracks = []
    levels = []
    constructor() {
      hlsMade.push(this.record)
    }
    on() {}
    loadSource() {}
    attachMedia() {
      this.record.attached = true
    }
    destroy() {}
  }
  return { default: Hls }
})

const events: EngineEvents = { onStop: () => {}, onTracks: () => {} }

test('does not touch the video when the session ended while hls.js loaded', async () => {
  hlsMade.length = 0
  const video = document.createElement('video')
  video.play = async () => {}
  await startEngine(video, 'https://s.example/a.m3u8', 'hls', events, () => false, () => false)
  expect(hlsMade).toEqual([])
  await startEngine(video, 'https://s.example/a.m3u8', 'hls', events, () => false, () => true)
  expect(hlsMade).toEqual([{ attached: true }])
})
