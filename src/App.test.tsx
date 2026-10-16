import { fireEvent, render, screen } from '@testing-library/react'
import { App } from './App'
import { useNavigation } from './ui/route'

beforeEach(() => useNavigation.setState({ screen: 'live' }))

test('the app opens on Live TV', () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: 'Live TV' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Live TV' }).getAttribute('aria-current')).toBe('page')
})

test('a navigation button opens its screen', () => {
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: 'Playlists' }))
  expect(screen.getByRole('heading', { name: 'Playlists' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Live TV' }).getAttribute('aria-current')).toBeNull()
})
