import { nowAndNext, parseXmltv, parseXmltvTime, unescapeXml } from './xmltv'

const GUIDE = `<?xml version="1.0" encoding="UTF-8"?>
<tv generator-info-name="test">
  <channel id="news.uk">
    <display-name lang="en">News UK</display-name>
    <display-name>News</display-name>
    <icon src="https://logo.example/news.png" />
  </channel>
  <channel id='films'><display-name>Films &amp; More</display-name></channel>
  <programme start="20261017100000 +0000" stop="20261017110000 +0000" channel="news.uk">
    <title lang="en">Morning &amp; News</title>
    <sub-title>Part 1</sub-title>
    <desc><![CDATA[The <b>news</b> of the day.]]></desc>
    <category>News</category>
  </programme>
  <programme start="20261017090000 +0000" stop="20261017100000 +0000" channel="news.uk"><title>Early</title></programme>
  <programme start="20261017110000 +0100" channel="news.uk"><title>No stop</title></programme>
  <programme start="20261016090000 +0000" stop="20261016100000 +0000" channel="news.uk"><title>Old</title></programme>
  <programme start="20261017100000 +0000" stop="20261017120000 +0000" channel="films"><title>A Film</title></programme>
</tv>`

const at = (iso: string) => Date.parse(iso)

test('reads XMLTV times with and without a zone', () => {
  expect(parseXmltvTime('20261017120000 +0100')).toBe(at('2026-10-17T11:00:00Z'))
  expect(parseXmltvTime('20261017120000 -0230')).toBe(at('2026-10-17T14:30:00Z'))
  expect(parseXmltvTime('202610171200')).toBe(at('2026-10-17T12:00:00Z'))
  expect(parseXmltvTime('soon')).toBeUndefined()
})

test('changes entities back to characters', () => {
  expect(unescapeXml('a &amp; b &lt;c&gt; &#233; &#xE9; &quot;q&quot; &unknown;')).toBe('a & b <c> é é "q" &unknown;')
})

test('reads the channels with their names and icons', () => {
  expect(parseXmltv(GUIDE).channels).toEqual([
    { id: 'news.uk', names: ['News UK', 'News'], icon: 'https://logo.example/news.png' },
    { id: 'films', names: ['Films & More'], icon: undefined },
  ])
})

test('reads the programmes in time order, with their texts', () => {
  const { programmes } = parseXmltv(GUIDE)
  expect(programmes['news.uk']?.map((p) => p.title)).toEqual(['Old', 'Early', 'Morning & News', 'No stop'])
  expect(programmes['news.uk']?.[2]).toEqual({
    start: at('2026-10-17T10:00:00Z'),
    stop: at('2026-10-17T11:00:00Z'),
    title: 'Morning & News',
    subTitle: 'Part 1',
    description: 'The <b>news</b> of the day.',
    category: 'News',
  })
  expect(programmes['news.uk']?.[3]?.stop).toBe(at('2026-10-17T10:30:00Z'))
})

test('keeps only the programmes in the time window and of the asked channels', () => {
  const guide = parseXmltv(GUIDE, { from: at('2026-10-17T09:30:00Z'), to: at('2026-10-17T10:15:00Z'), keep: (id) => id === 'news.uk' })
  expect(guide.programmes['news.uk']?.map((p) => p.title)).toEqual(['Early', 'Morning & News', 'No stop'])
  expect(guide.programmes['films']).toBeUndefined()
})

test('finds the programme that is on now and the next one', () => {
  const list = parseXmltv(GUIDE).programmes['news.uk']
  expect(nowAndNext(list, at('2026-10-17T10:30:00Z'))).toMatchObject({ now: { title: 'Morning & News' }, next: { title: 'No stop' } })
  expect(nowAndNext(list, at('2026-10-15T00:00:00Z'))).toEqual({ next: expect.objectContaining({ title: 'Old' }) })
  expect(nowAndNext(list, at('2026-10-18T00:00:00Z'))).toEqual({})
  expect(nowAndNext(undefined, 0)).toEqual({})
})
