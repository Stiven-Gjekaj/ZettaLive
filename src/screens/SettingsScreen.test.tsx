import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { clear } from 'idb-keyval'
import { useProfiles } from '../library/profiles'
import { useSettings } from '../library/settings'
import { ProfilePicker } from './ProfilePicker'
import { SettingsScreen } from './SettingsScreen'

beforeEach(async () => {
  await clear()
  await useProfiles.getState().start()
})

afterEach(() => vi.unstubAllGlobals())

test('adds a profile with a picture, and uses it', async () => {
  render(<SettingsScreen />)
  fireEvent.change(screen.getByLabelText('Add a profile'), { target: { value: 'Kid' } })
  const form = screen.getByLabelText('Add a profile').closest('form')!
  fireEvent.click(within(form).getByRole('radio', { name: 'Picture 4' }))
  fireEvent.click(screen.getByRole('button', { name: 'Add profile' }))
  const card = await screen.findByRole('listitem', { name: 'Kid' })
  expect(useProfiles.getState().profiles[1]).toMatchObject({ name: 'Kid', avatar: 3 })
  fireEvent.click(within(card).getByRole('button', { name: 'Use' }))
  await waitFor(() => expect(within(card).getByText('In use')).toBeTruthy())
})

test('changes the settings of the profile', () => {
  render(<SettingsScreen />)
  fireEvent.click(screen.getByLabelText('Hide the channels that cannot play in a browser'))
  fireEvent.change(screen.getByLabelText('Screen at the start'), { target: { value: 'guide' } })
  expect(useSettings.getState()).toMatchObject({ hideBlocked: true, startScreen: 'guide' })
})

test('refuses a file that is not a backup', async () => {
  render(<SettingsScreen />)
  fireEvent.change(screen.getByLabelText('Backup file'), { target: { files: [new File(['hello'], 'x.json')] } })
  expect((await screen.findByRole('alert')).textContent).toBe('The file is not a ZettaLive backup.')
})

test('asks who is watching when there are many profiles', async () => {
  const kid = await useProfiles.getState().add('Kid', 2)
  useProfiles.setState({ picked: false })
  render(<ProfilePicker />)
  fireEvent.click(screen.getByRole('button', { name: 'Kid' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  expect(useProfiles.getState().activeId).toBe(kid.id)
})
