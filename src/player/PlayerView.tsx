import { useCallback, useEffect, useRef, useState, type TouchEvent } from 'react'
import { channelByNumber, groupOf, type NumberedChannel } from '../iptv/channels'
import { useChannels } from '../iptv/useChannels'
import { ChannelLogo } from '../ui/ChannelLogo'
import { clock, useChannelProgrammes, useNow } from '../guide/useGuide'
import { nowAndNext, type Programme } from '../guide/xmltv'
import { startEngine, type Engine, type Track } from './engine'
import { useHealth } from './health'
import { addDigit, entryNumber, stepIn, type NumberEntry } from './numberEntry'
import { usePlayer } from './player'
import { BLOCK_TEXT, knownBlock, streamKind, type BlockReason, type StreamKind } from './stream'

const MAX_RETRIES = 3
const STALL_MS = 20_000
const ENTRY_MS = 1500
const CONTROLS_MS = 3500

type Status = 'loading' | 'playing' | 'paused' | 'reconnecting' | 'blocked'

interface Tracks {
  audio: Track[]
  audioId: number
  levels: Track[]
  level: number
}

const NO_TRACKS: Tracks = { audio: [], audioId: -1, levels: [], level: -1 }

/** Moves to the next or the previous channel of the list that opened the player. */
function useStep(channelId: string) {
  return useCallback(
    (delta: number) => {
      const { order, go } = usePlayer.getState()
      const next = stepIn(order, channelId, delta)
      if (next && next !== channelId) go(next)
    },
    [channelId],
  )
}

/** Now and next of the channel, from the guide. */
function NowNext({ programmes }: { programmes?: Programme[] }) {
  const time = useNow()
  const { now, next } = nowAndNext(programmes, time)
  if (!now && !next) return null
  return (
    <div className="player-guide">
      {now && (
        <p>
          <span className="dim">Now</span> {clock(now.start)} to {clock(now.stop)}: <strong>{now.title}</strong>
        </p>
      )}
      {next && (
        <p className="dim">
          Next {clock(next.start)}: {next.title}
        </p>
      )}
    </div>
  )
}

/** The playback of one channel. The player draws a new session for each channel. */
function PlayerSession({ channel, channels, programmes }: { channel: NumberedChannel; channels: NumberedChannel[]; programmes?: Programme[] }) {
  const video = useRef<HTMLVideoElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const engine = useRef<Engine | null>(null)
  const played = useRef(false)
  const retries = useRef(0)
  const known = knownBlock(channel)
  const [status, setStatus] = useState<Status>(known ? 'blocked' : 'loading')
  const [reason, setReason] = useState<BlockReason | undefined>(known)
  const [kind, setKind] = useState<StreamKind>(() => streamKind(channel.url))
  const [attempt, setAttempt] = useState(0)
  const [tracks, setTracks] = useState<Tracks>(NO_TRACKS)
  const [muted, setMuted] = useState(false)
  const [controls, setControls] = useState(true)
  const [entry, setEntry] = useState<NumberEntry>({ digits: '' })
  const [notice, setNotice] = useState('')
  const step = useStep(channel.id)
  const close = usePlayer((s) => s.close)

  const block = useCallback(
    (why: BlockReason) => {
      setStatus('blocked')
      setReason(why)
      useHealth.getState().mark(channel.id, why)
    },
    [channel.id],
  )

  useEffect(() => {
    if (known) useHealth.getState().mark(channel.id, known)
  }, [channel.id, known])

  // Start the stream, and start it again after a failure.
  useEffect(() => {
    const element = video.current
    if (!element || known) return
    let cancelled = false
    const refresh = () => {
      const e = engine.current
      if (e) setTracks({ audio: e.audioTracks(), audioId: e.audioTrack(), levels: e.levels(), level: e.level() })
    }
    startEngine(
      element,
      channel.url,
      kind,
      {
        onTracks: refresh,
        onStop: (stop) => {
          if (cancelled) return
          if (stop === 'wrong-kind') {
            if (kind === 'hls') return setKind('mpegts')
            return block('format')
          }
          if (stop === 'retry') {
            if (retries.current >= MAX_RETRIES) return block('network')
            retries.current++
            setStatus('reconnecting')
            setTimeout(() => !cancelled && setAttempt((a) => a + 1), 1000 * 2 ** retries.current)
            return
          }
          block(stop)
        },
      },
      () => played.current,
    ).then((e) => {
      if (cancelled) e.destroy()
      else {
        engine.current = e
        refresh()
      }
    })
    return () => {
      cancelled = true
      engine.current?.destroy()
      engine.current = null
    }
  }, [channel.url, kind, attempt, known, block])

  // Start again when the stream waits for data for too long.
  useEffect(() => {
    const element = video.current
    if (!element) return
    let stall: ReturnType<typeof setTimeout> | undefined
    const onPlaying = () => {
      clearTimeout(stall)
      played.current = true
      retries.current = 0
      setStatus('playing')
      useHealth.getState().clear(channel.id)
    }
    const onWaiting = () => {
      clearTimeout(stall)
      stall = setTimeout(() => {
        setStatus('reconnecting')
        setAttempt((a) => a + 1)
      }, STALL_MS)
    }
    const onPause = () => setStatus((s) => (s === 'playing' ? 'paused' : s))
    const onVolume = () => setMuted(element.muted)
    element.addEventListener('playing', onPlaying)
    element.addEventListener('waiting', onWaiting)
    element.addEventListener('pause', onPause)
    element.addEventListener('volumechange', onVolume)
    return () => {
      clearTimeout(stall)
      element.removeEventListener('playing', onPlaying)
      element.removeEventListener('waiting', onWaiting)
      element.removeEventListener('pause', onPause)
      element.removeEventListener('volumechange', onVolume)
    }
  }, [channel.id])

  // Hide the controls when nothing happens for a short time.
  useEffect(() => {
    if (!controls || status !== 'playing') return
    const t = setTimeout(() => setControls(false), CONTROLS_MS)
    return () => clearTimeout(t)
  }, [controls, status])

  // Go to the typed channel number after a short pause.
  const commitEntry = useCallback(
    (current: NumberEntry) => {
      setEntry({ digits: '' })
      const n = entryNumber(current)
      if (n === undefined) return
      const target = channelByNumber(channels, n)
      if (target) usePlayer.getState().go(target.id)
      else setNotice(`There is no channel ${n}.`)
    },
    [channels],
  )

  useEffect(() => {
    if (!entry.digits) return
    const t = setTimeout(() => commitEntry(entry), ENTRY_MS)
    return () => clearTimeout(t)
  }, [entry, commitEntry])

  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(''), 2500)
    return () => clearTimeout(t)
  }, [notice])

  const togglePlay = useCallback(() => {
    const element = video.current
    if (!element) return
    if (element.paused) void element.play().catch(() => {})
    else element.pause()
  }, [])

  const toggleMute = useCallback(() => {
    const element = video.current
    if (element) element.muted = !element.muted
  }, [])

  const toggleFullscreen = useCallback(() => {
    const element = video.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null
    if (document.fullscreenElement) void document.exitFullscreen()
    else if (box.current?.requestFullscreen) void box.current.requestFullscreen().catch(() => {})
    else element?.webkitEnterFullscreen?.()
  }, [])

  // The keys of a desktop keyboard.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.metaKey || e.ctrlKey || e.altKey) return
      setControls(true)
      if (/^\d$/.test(e.key)) setEntry((current) => addDigit(current, e.key))
      else if (e.key === 'Enter' && entry.digits) commitEntry(entry)
      else if (e.key === 'ArrowDown' || e.key === 'PageDown') step(1)
      else if (e.key === 'ArrowUp' || e.key === 'PageUp') step(-1)
      else if (e.key === ' ' || e.key === 'k') togglePlay()
      else if (e.key === 'm') toggleMute()
      else if (e.key === 'f') toggleFullscreen()
      else if (e.key === 'Escape' && !document.fullscreenElement) close()
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [entry, commitEntry, step, togglePlay, toggleMute, toggleFullscreen, close])

  // A swipe on a phone: up for the next channel, down for the previous one.
  const touchY = useRef<number | null>(null)
  const onTouchStart = (e: TouchEvent) => {
    touchY.current = e.touches[0]?.clientY ?? null
  }
  const onTouchEnd = (e: TouchEvent) => {
    const start = touchY.current
    const end = e.changedTouches[0]?.clientY
    touchY.current = null
    if (start === null || end === undefined) return
    if (start - end > 60) step(1)
    else if (end - start > 60) step(-1)
    else setControls((c) => !c)
  }

  const statusText =
    status === 'loading' ? 'Loading...' : status === 'reconnecting' ? 'The stream stopped. Connecting again...' : status === 'paused' ? 'Paused' : ''

  return (
    <div
      ref={box}
      className={`player${controls ? ' show-controls' : ''}`}
      role="dialog"
      aria-label={`Playing ${channel.name}`}
      onMouseMove={() => setControls(true)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <video ref={video} className="player-video" playsInline autoPlay onClick={() => setControls((c) => !c)} />

      {status === 'blocked' && reason ? (
        <div className="player-message" role="alert">
          <p className="player-message-title">This channel cannot play in a browser.</p>
          <p className="dim">{BLOCK_TEXT[reason]}</p>
          <div className="row">
            <button type="button" className="button button-primary" onClick={() => step(1)}>
              Next channel
            </button>
            <button type="button" className="button" onClick={close}>
              Back to the list
            </button>
          </div>
        </div>
      ) : (
        statusText && (
          <p className="player-status" role="status">
            {statusText}
          </p>
        )
      )}

      {(entry.digits || notice) && <div className="player-entry">{entry.digits || notice}</div>}

      <div className="player-top">
        <button type="button" className="button button-small" onClick={close}>
          Back
        </button>
        <ChannelLogo name={channel.name} logo={channel.logo} size={36} />
        <div className="player-title">
          <span className="channel-name">
            {channel.shown} {channel.name}
          </span>
          <span className="dim">{groupOf(channel)}</span>
        </div>
        <NowNext programmes={programmes} />
      </div>

      <div className="player-bottom">
        <button type="button" className="button button-small" aria-label="Previous channel" onClick={() => step(-1)}>
          Previous
        </button>
        <button type="button" className="button button-small" onClick={togglePlay} disabled={status === 'blocked'}>
          {status === 'paused' ? 'Play' : 'Pause'}
        </button>
        <button type="button" className="button button-small" aria-label="Next channel" onClick={() => step(1)}>
          Next
        </button>
        <span className="grow" />
        <button type="button" className="button button-small" onClick={toggleMute}>
          {muted ? 'Sound on' : 'Mute'}
        </button>
        {tracks.audio.length > 1 && (
          <select
            className="input select"
            aria-label="Audio track"
            value={tracks.audioId}
            onChange={(e) => {
              engine.current?.setAudioTrack(Number(e.target.value))
              setTracks((t) => ({ ...t, audioId: Number(e.target.value) }))
            }}
          >
            {tracks.audio.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        )}
        {tracks.levels.length > 1 && (
          <select
            className="input select"
            aria-label="Quality"
            value={tracks.level}
            onChange={(e) => {
              engine.current?.setLevel(Number(e.target.value))
              setTracks((t) => ({ ...t, level: Number(e.target.value) }))
            }}
          >
            <option value={-1}>Auto</option>
            {tracks.levels.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        )}
        <button type="button" className="button button-small" onClick={toggleFullscreen}>
          Full screen
        </button>
      </div>
    </div>
  )
}

/** The full screen player. It shows when a channel is open. */
export function PlayerView() {
  const channelId = usePlayer((s) => s.channelId)
  const channels = useChannels()
  const programmes = useChannelProgrammes()
  const channel = channelId ? channels.find((c) => c.id === channelId) : undefined
  if (!channel) return null
  return <PlayerSession key={channel.id} channel={channel} channels={channels} programmes={programmes.get(channel.id)} />
}
