import { clear } from 'idb-keyval'
import { DEFAULT_SETTINGS, createSettings } from './settings'

beforeEach(() => clear())

test('keeps the settings of a profile, and uses the defaults for a new one', async () => {
  const settings = createSettings()
  await settings.getState().load('a')
  expect(settings.getState()).toMatchObject(DEFAULT_SETTINGS)
  settings.getState().change({ startScreen: 'guide' })
  await new Promise((r) => setTimeout(r, 20))
  const next = createSettings()
  await next.getState().load('a')
  expect(next.getState()).toMatchObject({ startScreen: 'guide', hideBlocked: false })
  await next.getState().load('b')
  expect(next.getState().startScreen).toBe('live')
})
