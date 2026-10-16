import { clear, get } from 'idb-keyval'
import { useLibrary } from './library'
import { createProfiles } from './profiles'
import { useSettings } from './settings'

beforeEach(() => clear())

const settle = () => new Promise((r) => setTimeout(r, 20))

test('starts with one profile that needs no choice', async () => {
  const profiles = createProfiles()
  await profiles.getState().start()
  expect(profiles.getState()).toMatchObject({ profiles: [{ id: 'default', name: 'Me' }], activeId: 'default', picked: true })
})

test('asks for a choice when there are many profiles, and keeps the active one', async () => {
  const profiles = createProfiles()
  await profiles.getState().start()
  const kid = await profiles.getState().add(' Kid ', 3)
  await profiles.getState().choose(kid.id)
  const next = createProfiles()
  await next.getState().start()
  expect(next.getState()).toMatchObject({ activeId: kid.id, picked: false })
  expect(next.getState().profiles.map((p) => p.name)).toEqual(['Me', 'Kid'])
})

test('loads the favourites and the settings of the chosen profile', async () => {
  const profiles = createProfiles()
  await profiles.getState().start()
  useLibrary.getState().toggleFavourite('p:a')
  useSettings.getState().change({ hideBlocked: true })
  await settle()
  const kid = await profiles.getState().add('Kid', 1)
  await profiles.getState().choose(kid.id)
  expect(useLibrary.getState().favourites).toEqual([])
  expect(useSettings.getState().hideBlocked).toBe(false)
  await profiles.getState().choose('default')
  expect(useLibrary.getState().favourites).toEqual(['p:a'])
  expect(useSettings.getState().hideBlocked).toBe(true)
})

test('edits a profile, removes it with its data, and never removes the last one', async () => {
  const profiles = createProfiles()
  await profiles.getState().start()
  const kid = await profiles.getState().add('Kid', 1)
  await profiles.getState().choose(kid.id)
  useLibrary.getState().toggleFavourite('p:b')
  await settle()
  await profiles.getState().edit(kid.id, { name: 'Child', avatar: 5 })
  expect(profiles.getState().profiles[1]).toMatchObject({ name: 'Child', avatar: 5 })
  await profiles.getState().remove(kid.id)
  expect(profiles.getState().activeId).toBe('default')
  expect(await get(`library:${kid.id}`)).toBeUndefined()
  await profiles.getState().remove('default')
  expect(profiles.getState().profiles).toHaveLength(1)
})
