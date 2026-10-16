import type { BlockReason, StreamKind } from './stream'

/** An audio track or a quality level. */
export interface Track {
  id: number
  label: string
}

/** Why the engine stopped. `retry` asks the player to start again. `wrong-kind` asks it to try MPEG-TS. */
export type Stop = BlockReason | 'retry' | 'wrong-kind'

export interface EngineEvents {
  /** The engine cannot go on. */
  onStop: (stop: Stop) => void
  /** The audio tracks or the quality levels changed. */
  onTracks: () => void
}

/** One stream that plays in one video element. */
export interface Engine {
  destroy: () => void
  audioTracks: () => Track[]
  audioTrack: () => number
  setAudioTrack: (id: number) => void
  levels: () => Track[]
  /** The chosen level, or -1 for the automatic choice. */
  level: () => number
  setLevel: (id: number) => void
}

const NONE: Pick<Engine, 'audioTracks' | 'audioTrack' | 'setAudioTrack' | 'levels' | 'level' | 'setLevel'> = {
  audioTracks: () => [],
  audioTrack: () => -1,
  setAudioTrack: () => {},
  levels: () => [],
  level: () => -1,
  setLevel: () => {},
}

function trackLabel(name: string | undefined, lang: string | undefined, index: number): string {
  return [name, lang && lang !== name ? `(${lang})` : ''].filter(Boolean).join(' ') || `Track ${index + 1}`
}

interface NativeAudioTrack {
  enabled: boolean
  label: string
  language: string
}

type NativeTracks = ArrayLike<NativeAudioTrack> & { addEventListener?: (type: string, fn: () => void) => void }

/** True when the browser plays HLS itself, as Safari does. */
export function playsHlsNatively(video: HTMLVideoElement): boolean {
  return video.canPlayType('application/vnd.apple.mpegurl') !== ''
}

function startNative(video: HTMLVideoElement, url: string, events: EngineEvents, played: () => boolean): Engine {
  const tracks = (video as unknown as { audioTracks?: NativeTracks }).audioTracks
  const onError = () => {
    const code = video.error?.code
    events.onStop(played() ? 'retry' : code === MediaError.MEDIA_ERR_NETWORK ? 'network' : 'format')
  }
  video.addEventListener('error', onError)
  tracks?.addEventListener?.('change', events.onTracks)
  tracks?.addEventListener?.('addtrack', events.onTracks)
  video.src = url
  void video.play().catch(() => {})
  return {
    ...NONE,
    destroy() {
      video.removeEventListener('error', onError)
      video.removeAttribute('src')
      video.load()
    },
    audioTracks: () => Array.from(tracks ?? [], (t, i) => ({ id: i, label: trackLabel(t.label, t.language, i) })),
    audioTrack: () => Array.from(tracks ?? []).findIndex((t) => t.enabled),
    setAudioTrack: (id) => Array.from(tracks ?? []).forEach((t, i) => (t.enabled = i === id)),
  }
}

/** An engine that does nothing. The player gets it when the session ended while the engine loaded. */
const IDLE: Engine = { ...NONE, destroy() {} }

async function startHls(video: HTMLVideoElement, url: string, events: EngineEvents, played: () => boolean, alive: () => boolean): Promise<Engine> {
  const { default: Hls } = await import('hls.js')
  // Do not touch the video when the session ended while hls.js loaded.
  if (!alive()) return IDLE
  if (!Hls.isSupported()) {
    if (playsHlsNatively(video)) return startNative(video, url, events, played)
    events.onStop('format')
    return IDLE
  }
  const hls = new Hls({ lowLatencyMode: true, backBufferLength: 30 })
  let mediaRetried = false
  hls.on(Hls.Events.ERROR, (_event, data) => {
    if (!data.fatal) return
    if (data.type === Hls.ErrorTypes.MEDIA_ERROR && !mediaRetried) {
      mediaRetried = true
      hls.recoverMediaError()
      return
    }
    if (data.details === Hls.ErrorDetails.MANIFEST_PARSING_ERROR) return events.onStop('wrong-kind')
    if (data.type === Hls.ErrorTypes.NETWORK_ERROR) return events.onStop(played() ? 'retry' : 'network')
    events.onStop(played() ? 'retry' : 'format')
  })
  hls.on(Hls.Events.MANIFEST_PARSED, events.onTracks)
  hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, events.onTracks)
  hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, events.onTracks)
  hls.on(Hls.Events.LEVEL_SWITCHED, events.onTracks)
  hls.loadSource(url)
  hls.attachMedia(video)
  void video.play().catch(() => {})
  return {
    destroy: () => hls.destroy(),
    audioTracks: () => hls.audioTracks.map((t, i) => ({ id: i, label: trackLabel(t.name, t.lang, i) })),
    audioTrack: () => hls.audioTrack,
    setAudioTrack: (id) => {
      hls.audioTrack = id
    },
    levels: () =>
      hls.levels.map((l, i) => ({ id: i, label: l.height ? `${l.height}p` : l.bitrate ? `${Math.round(l.bitrate / 1000)} kbps` : `Level ${i + 1}` })),
    level: () => (hls.autoLevelEnabled ? -1 : hls.currentLevel),
    setLevel: (id) => {
      hls.currentLevel = id
    },
  }
}

async function startMpegts(video: HTMLVideoElement, url: string, events: EngineEvents, played: () => boolean, alive: () => boolean): Promise<Engine> {
  const { default: mpegts } = await import('mpegts.js')
  if (!alive()) return IDLE
  if (!mpegts.isSupported() || !mpegts.getFeatureList().mseLivePlayback) {
    events.onStop('format')
    return IDLE
  }
  const player = mpegts.createPlayer({ type: 'mpegts', isLive: true, url }, { liveBufferLatencyChasing: true, enableWorker: true })
  player.on(mpegts.Events.ERROR, (type: string) => {
    if (type === mpegts.ErrorTypes.NETWORK_ERROR) return events.onStop(played() ? 'retry' : 'network')
    events.onStop(played() ? 'retry' : 'format')
  })
  player.attachMediaElement(video)
  player.load()
  void Promise.resolve(player.play()).catch(() => {})
  return {
    ...NONE,
    destroy() {
      player.destroy()
    },
  }
}

/**
 * Starts a stream in the video element with the right engine. `alive` is
 * false when the session ended before the engine loaded. Then the engine does
 * not touch the video, which a newer session can use already.
 */
export function startEngine(
  video: HTMLVideoElement,
  url: string,
  kind: StreamKind,
  events: EngineEvents,
  played: () => boolean,
  alive: () => boolean = () => true,
): Promise<Engine> {
  if (kind === 'file') return Promise.resolve(startNative(video, url, events, played))
  if (kind === 'mpegts') return startMpegts(video, url, events, played, alive)
  return startHls(video, url, events, played, alive)
}
