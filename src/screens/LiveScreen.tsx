import { useMemo, useState } from 'react'
import { NO_GROUP, groupOf, groupsOf, isHidden, listChannels, type ChannelFilter, type NumberedChannel } from '../iptv/channels'
import { usePlaylists } from '../iptv/playlists'
import { useChannels } from '../iptv/useChannels'
import { useLibrary } from '../library/library'
import { ChannelLogo } from '../ui/ChannelLogo'
import { VirtualList } from '../ui/VirtualList'
import { useNavigation } from '../ui/route'
import { useHealth } from '../player/health'
import { usePlayer } from '../player/player'
import { knownBlock } from '../player/stream'
import { nowAndNext, type Programme } from '../guide/xmltv'
import { useChannelProgrammes, useNow } from '../guide/useGuide'

const ROW = 64

function sameFilter(a: ChannelFilter, b: ChannelFilter): boolean {
  return a.kind === b.kind && (a.kind !== 'group' || (b.kind === 'group' && a.group === b.group))
}

function Chip({ filter, current, label, onPick }: { filter: ChannelFilter; current: ChannelFilter; label: string; onPick: (f: ChannelFilter) => void }) {
  return (
    <button type="button" className="chip" aria-pressed={sameFilter(filter, current)} onClick={() => onPick(filter)}>
      {label}
    </button>
  )
}

interface RowProps {
  channel: NumberedChannel
  favourite: boolean
  hidden: boolean
  blocked: boolean
  now?: Programme
  onPlay: (channel: NumberedChannel) => void
}

function ChannelRow({ channel, favourite, hidden, blocked, now, onPlay }: RowProps) {
  const { toggleFavourite, setChannelHidden } = useLibrary.getState()
  return (
    <div className="channel-row">
      <button type="button" className="channel-play" aria-label={`Play ${channel.name}`} onClick={() => onPlay(channel)}>
        <span className="channel-number">{channel.shown}</span>
        <ChannelLogo name={channel.name} logo={channel.logo} />
        <span className="channel-text">
          <span className="channel-name">{channel.name}</span>
          <span className="channel-group dim">
            {blocked && <span className="badge">Cannot play here</span>}
            {now ? `Now: ${now.title}` : groupOf(channel)}
          </span>
        </span>
      </button>
      <button
        type="button"
        className="icon-button"
        aria-pressed={favourite}
        aria-label={favourite ? `Remove ${channel.name} from favourites` : `Add ${channel.name} to favourites`}
        title={favourite ? 'Remove from favourites' : 'Add to favourites'}
        onClick={() => toggleFavourite(channel.id)}
      >
        {favourite ? '★' : '☆'}
      </button>
      <button type="button" className="button button-small" onClick={() => setChannelHidden(channel.id, !hidden)}>
        {hidden ? 'Show' : 'Hide'}
      </button>
    </div>
  )
}

/** The channels of all playlists, with groups, search, favourites, and hidden items. */
export function LiveScreen() {
  const channels = useChannels()
  const loading = usePlaylists((s) => Object.values(s.results).some((r) => r.status === 'loading'))
  const hasPlaylists = usePlaylists((s) => s.sources.length > 0)
  const favourites = useLibrary((s) => s.favourites)
  const hiddenGroups = useLibrary((s) => s.hiddenGroups)
  const hiddenChannels = useLibrary((s) => s.hiddenChannels)
  const [filter, setFilter] = useState<ChannelFilter>({ kind: 'all' })
  const [query, setQuery] = useState('')
  const blocked = useHealth((s) => s.blocked)
  const programmes = useChannelProgrammes()
  const time = useNow()

  const groups = useMemo(() => groupsOf(channels), [channels])
  const shown = useMemo(
    () => listChannels(channels, { filter, query, favourites, hiddenGroups, hiddenChannels }),
    [channels, filter, query, favourites, hiddenGroups, hiddenChannels],
  )
  const favouriteSet = useMemo(() => new Set(favourites), [favourites])
  const hiddenCount = useMemo(() => channels.filter((c) => isHidden(c, hiddenGroups, hiddenChannels)).length, [channels, hiddenGroups, hiddenChannels])

  if (!hasPlaylists) {
    return (
      <section>
        <h1 className="screen-title">Live TV</h1>
        <div className="card stack">
          <p>You have no playlists yet.</p>
          <div className="row">
            <button type="button" className="button button-primary" onClick={() => useNavigation.getState().open('playlists')}>
              Add a playlist
            </button>
          </div>
        </div>
      </section>
    )
  }

  const visibleGroups = groups.filter((g) => !hiddenGroups.includes(g))
  const { setGroupHidden } = useLibrary.getState()

  return (
    <section className="screen-fill">
      <div className="row live-head">
        <h1 className="grow">Live TV</h1>
        <input className="input search" type="search" aria-label="Search channels" placeholder="Search channels" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <div className="chips" aria-label="Filters">
        <Chip filter={{ kind: 'all' }} current={filter} label="All" onPick={setFilter} />
        <Chip filter={{ kind: 'favourites' }} current={filter} label="Favourites" onPick={setFilter} />
        {visibleGroups.map((g) => (
          <Chip key={g} filter={{ kind: 'group', group: g }} current={filter} label={g} onPick={setFilter} />
        ))}
        {hiddenCount > 0 && <Chip filter={{ kind: 'hidden' }} current={filter} label={`Hidden (${hiddenCount})`} onPick={setFilter} />}
      </div>
      {filter.kind === 'group' && (
        <div className="row list-tools">
          <span className="dim grow">{filter.group === NO_GROUP ? 'Channels with no group' : filter.group}</span>
          <button
            type="button"
            className="button button-small"
            onClick={() => {
              setGroupHidden(filter.group, true)
              setFilter({ kind: 'all' })
            }}
          >
            Hide this group
          </button>
        </div>
      )}
      {filter.kind === 'hidden' && hiddenGroups.length > 0 && (
        <div className="row list-tools">
          <span className="dim">Hidden groups:</span>
          {hiddenGroups.map((g) => (
            <button key={g} type="button" className="button button-small" onClick={() => setGroupHidden(g, false)}>
              Show {g}
            </button>
          ))}
        </div>
      )}
      {shown.length === 0 ? (
        <p className="dim empty">{loading ? 'Loading the channels...' : filter.kind === 'favourites' && !query ? 'You have no favourite channels. Tap the star of a channel.' : 'No channel matches.'}</p>
      ) : (
        <VirtualList
          label="Channels"
          items={shown}
          rowHeight={ROW}
          keyOf={(c) => c.id}
          renderRow={(c) => (
            <ChannelRow
              channel={c}
              favourite={favouriteSet.has(c.id)}
              hidden={isHidden(c, hiddenGroups, hiddenChannels)}
              blocked={Boolean(blocked[c.id] ?? knownBlock(c))}
              now={nowAndNext(programmes.get(c.id), time).now}
              onPlay={(picked) => usePlayer.getState().open(picked.id, shown.map((x) => x.id))}
            />
          )}
        />
      )}
    </section>
  )
}
