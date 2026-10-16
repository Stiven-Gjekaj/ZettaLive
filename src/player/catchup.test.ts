import type { Channel } from '../iptv/m3u'
import { canCatchUp, catchupUrl, fillCatchup, formatTime } from './catchup'

const at = (iso: string) => Date.parse(iso)
const START = at('2026-10-17T08:00:00Z')
const STOP = at('2026-10-17T09:00:00Z')
const NOW = at('2026-10-17T10:00:00Z')
const s = (ms: number) => ms / 1000

const channel = (url: string, extra: Partial<Channel> = {}): Channel => ({ id: 'x', playlistId: 'p', name: 'X', url, ...extra })

test('writes a time with tokens, in UTC', () => {
  expect(formatTime(START, 'Y-m-d:H-M')).toBe('2026-10-17:08-00')
})

test('fills the common place holders', () => {
  expect(fillCatchup('?utc={utc}&lutc={lutc}&d={duration}&o=${offset}', START, STOP, NOW)).toBe(`?utc=${s(START)}&lutc=${s(NOW)}&d=3600&o=7200`)
  expect(fillCatchup('/{Y}/{m}/{d}/{H}{M}{S}/{utc:YmdHMS}-{utcend:YmdHMS}', START, STOP, NOW)).toBe('/2026/10/17/080000/20261017080000-20261017090000')
})

test('builds the URL of each catch-up kind', () => {
  expect(catchupUrl(channel('https://a.example/live.m3u8', { catchup: 'append', catchupSource: '?start={utc}' }), START, STOP, NOW)).toBe(
    `https://a.example/live.m3u8?start=${s(START)}`,
  )
  expect(catchupUrl(channel('https://a.example/live.m3u8?t=1', { catchup: 'shift' }), START, STOP, NOW)).toBe(
    `https://a.example/live.m3u8?t=1&utc=${s(START)}&lutc=${s(NOW)}`,
  )
  expect(catchupUrl(channel('https://a.example/x', { catchup: 'default', catchupSource: 'https://b.example/arc/{utc}/{utcend}' }), START, STOP, NOW)).toBe(
    `https://b.example/arc/${s(START)}/${s(STOP)}`,
  )
  expect(catchupUrl(channel('https://fs.example/ch1/index.m3u8?token=t', { catchup: 'flussonic' }), START, STOP, NOW)).toBe(
    `https://fs.example/ch1/index-${s(START)}-3600.m3u8?token=t`,
  )
  expect(catchupUrl(channel('https://fs.example/ch1/mpegts', { catchup: 'fs' }), START, STOP, NOW)).toBe(`https://fs.example/ch1/timeshift_abs-${s(START)}.ts`)
  expect(catchupUrl(channel('https://xc.example:8080/live/user/pass/123.m3u8', { catchup: 'xc' }), START, STOP, NOW)).toBe(
    'https://xc.example:8080/timeshift/user/pass/60/2026-10-17:08-00/123.m3u8',
  )
  expect(catchupUrl(channel('https://a.example/x'), START, STOP, NOW)).toBeUndefined()
})

test('allows a catch-up only for a past programme in the days of the channel', () => {
  const c = channel('https://a.example/x', { catchup: 'shift', catchupDays: 1 })
  expect(canCatchUp(c, START, STOP, NOW)).toBe(true)
  expect(canCatchUp(c, START, NOW + 1, NOW)).toBe(false)
  expect(canCatchUp(c, START - 2 * 86_400_000, STOP - 2 * 86_400_000, NOW)).toBe(false)
  expect(canCatchUp(channel('https://a.example/x'), START, STOP, NOW)).toBe(false)
})
