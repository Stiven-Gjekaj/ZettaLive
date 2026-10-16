import { clear } from 'idb-keyval'
import { MAX_RECENTS, createLibrary } from './library'

beforeEach(() => clear())

const settle = () => new Promise((r) => setTimeout(r, 20))

test('keeps the favourites and the hidden items of a profile for the next start', async () => {
  const library = createLibrary()
  await library.getState().load('default')
  library.getState().toggleFavourite('p:a')
  library.getState().toggleFavourite('p:b')
  library.getState().toggleFavourite('p:a')
  library.getState().setChannelHidden('p:c', true)
  library.getState().setGroupHidden('Sports', true)
  library.getState().setGroupHidden('News', true)
  library.getState().setGroupHidden('Sports', false)
  await settle()

  const next = createLibrary()
  await next.getState().load('default')
  expect(next.getState()).toMatchObject({ favourites: ['p:b'], hiddenChannels: ['p:c'], hiddenGroups: ['News'] })
})

test('keeps each profile apart', async () => {
  const library = createLibrary()
  await library.getState().load('one')
  library.getState().toggleFavourite('p:a')
  await settle()
  await library.getState().load('two')
  expect(library.getState().favourites).toEqual([])
  await library.getState().load('one')
  expect(library.getState().favourites).toEqual(['p:a'])
})

test('keeps the recent channels, newest first, with no copies and a limit', async () => {
  const library = createLibrary()
  await library.getState().load('default')
  for (const id of ['a', 'b', 'a', 'c']) library.getState().addRecent(id)
  expect(library.getState().recents).toEqual(['c', 'a', 'b'])
  for (let i = 0; i < 30; i++) library.getState().addRecent(`x${i}`)
  expect(library.getState().recents).toHaveLength(MAX_RECENTS)
  expect(library.getState().recents[0]).toBe('x29')
  await settle()
  const next = createLibrary()
  await next.getState().load('default')
  expect(next.getState().recents[0]).toBe('x29')
  next.getState().clearRecents()
  expect(next.getState().recents).toEqual([])
})
