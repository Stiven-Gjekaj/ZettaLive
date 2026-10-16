import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { isHidden, type NumberedChannel } from '../iptv/channels'
import { useChannels } from '../iptv/useChannels'
import { useLibrary } from '../library/library'
import { usePlayer } from '../player/player'
import { clock, useChannelProgrammes, useNow } from '../guide/useGuide'
import type { Programme } from '../guide/xmltv'
import { ChannelLogo } from '../ui/ChannelLogo'
import { useNavigation } from '../ui/route'

const ROW = 56
const HEAD = 32
const NAME = 168
const PX_PER_MIN = 4
const SLOT_MIN = 30
const HOURS = 24
const EXTRA_ROWS = 4

/** The start of the grid: the half hour before the half hour of now. */
export function gridStart(now: number): number {
  const slot = SLOT_MIN * 60_000
  return Math.floor(now / slot) * slot - slot
}

interface Picked {
  channel: NumberedChannel
  programme: Programme
}

/** A grid of the programmes of the channels for the next 24 hours. */
export function GuideScreen() {
  const now = useNow()
  const channels = useChannels()
  const programmes = useChannelProgrammes()
  const favourites = useLibrary((s) => s.favourites)
  const hiddenGroups = useLibrary((s) => s.hiddenGroups)
  const hiddenChannels = useLibrary((s) => s.hiddenChannels)
  const [onlyFavourites, setOnlyFavourites] = useState(false)
  const [picked, setPicked] = useState<Picked>()
  const [view, setView] = useState({ top: 0, left: 0, width: 1200, height: 800 })
  const grid = useRef<HTMLDivElement>(null)

  const start = useMemo(() => gridStart(now), [now])
  const end = start + HOURS * 3600_000
  const width = HOURS * 60 * PX_PER_MIN
  const x = (ms: number) => ((ms - start) / 60_000) * PX_PER_MIN

  const rows = useMemo(() => {
    const favouriteSet = new Set(favourites)
    return channels.filter(
      (c) => programmes.has(c.id) && !isHidden(c, hiddenGroups, hiddenChannels) && (!onlyFavourites || favouriteSet.has(c.id)),
    )
  }, [channels, programmes, favourites, hiddenGroups, hiddenChannels, onlyFavourites])

  // Show the time of now near the left edge at the start.
  useLayoutEffect(() => {
    const element = grid.current
    if (element) element.scrollLeft = Math.max(0, x(now) - 60)
    // Only at the first draw.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (programmes.size === 0) {
    return (
      <section>
        <h1 className="screen-title">Guide</h1>
        <div className="card stack">
          <p>No guide is loaded.</p>
          <p className="dim">A playlist can name its guide. You can also add a guide URL on the Playlists screen.</p>
          <div className="row">
            <button type="button" className="button button-primary" onClick={() => useNavigation.getState().open('playlists')}>
              Add a guide
            </button>
          </div>
        </div>
      </section>
    )
  }

  const first = Math.max(0, Math.floor(view.top / ROW) - EXTRA_ROWS)
  const last = Math.min(rows.length, Math.ceil((view.top + view.height) / ROW) + EXTRA_ROWS)
  const fromMs = start + ((view.left - NAME) / PX_PER_MIN) * 60_000
  const toMs = start + ((view.left + view.width) / PX_PER_MIN) * 60_000
  const slots = Array.from({ length: (HOURS * 60) / SLOT_MIN }, (_, i) => start + i * SLOT_MIN * 60_000)
  const play = (channel: NumberedChannel) => usePlayer.getState().open(channel.id, rows.map((c) => c.id))

  return (
    <section className="screen-fill">
      <div className="row live-head">
        <h1 className="grow">Guide</h1>
        <div className="chips">
          <button type="button" className="chip" aria-pressed={!onlyFavourites} onClick={() => setOnlyFavourites(false)}>
            All
          </button>
          <button type="button" className="chip" aria-pressed={onlyFavourites} onClick={() => setOnlyFavourites(true)}>
            Favourites
          </button>
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="dim empty">No channel with a guide matches.</p>
      ) : (
        <div
          ref={grid}
          className="guide-grid"
          role="grid"
          aria-label="Guide"
          onScroll={(e) => {
            const t = e.currentTarget
            setView({ top: t.scrollTop, left: t.scrollLeft, width: t.clientWidth || 1200, height: t.clientHeight || 800 })
          }}
        >
          <div className="guide-canvas" style={{ width: NAME + width, height: HEAD + rows.length * ROW }}>
            <div className="guide-head" style={{ width: NAME + width, height: HEAD }}>
              <div className="guide-corner" style={{ width: NAME }} />
              {slots.map((t) => (
                <span key={t} className="guide-slot" style={{ left: NAME + x(t), width: SLOT_MIN * PX_PER_MIN }}>
                  {clock(t)}
                </span>
              ))}
            </div>
            {now >= start && now < end && <div className="guide-now" style={{ left: NAME + x(now), top: 0, height: HEAD + rows.length * ROW }} />}
            {rows.slice(first, last).map((channel, i) => {
              const top = HEAD + (first + i) * ROW
              const list = (programmes.get(channel.id) ?? []).filter((p) => p.stop > Math.max(fromMs, start) && p.start < Math.min(toMs, end))
              return (
                <div key={channel.id} role="row" className="guide-row" style={{ top, height: ROW, width: NAME + width }}>
                  <button type="button" role="rowheader" className="guide-channel" style={{ width: NAME }} onClick={() => play(channel)} aria-label={`Play ${channel.name}`}>
                    <ChannelLogo name={channel.name} logo={channel.logo} size={32} />
                    <span className="channel-name">{channel.name}</span>
                  </button>
                  {list.map((p) => {
                    const left = Math.max(0, x(p.start))
                    const right = Math.min(width, x(p.stop))
                    const live = p.start <= now && p.stop > now
                    return (
                      <button
                        key={p.start}
                        type="button"
                        role="gridcell"
                        className={`guide-programme${live ? ' live' : ''}`}
                        style={{ left: NAME + left, width: Math.max(2, right - left - 2) }}
                        title={`${clock(p.start)} ${p.title}`}
                        onClick={() => setPicked({ channel, programme: p })}
                      >
                        <span className="guide-programme-title">{p.title}</span>
                        <span className="dim">{clock(p.start)}</span>
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      )}
      {picked && (
        <div className="sheet" role="dialog" aria-label={picked.programme.title}>
          <div className="row">
            <h2 className="grow">{picked.programme.title}</h2>
            <button type="button" className="button button-small" onClick={() => setPicked(undefined)}>
              Close
            </button>
          </div>
          <p className="dim">
            {picked.channel.name}, {clock(picked.programme.start)} to {clock(picked.programme.stop)}
            {picked.programme.category ? `, ${picked.programme.category}` : ''}
          </p>
          {picked.programme.subTitle && <p>{picked.programme.subTitle}</p>}
          {picked.programme.description && <p className="sheet-text">{picked.programme.description}</p>}
          <div className="row">
            <button
              type="button"
              className="button button-primary"
              onClick={() => {
                setPicked(undefined)
                play(picked.channel)
              }}
            >
              Watch {picked.channel.name}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
