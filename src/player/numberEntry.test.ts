import { addDigit, entryNumber, stepIn } from './numberEntry'

test('builds a channel number from digits', () => {
  let entry = { digits: '' }
  for (const d of ['1', '0', 'x', '2']) entry = addDigit(entry, d)
  expect(entry.digits).toBe('102')
  expect(entryNumber(entry)).toBe(102)
  expect(entryNumber({ digits: '000' })).toBeUndefined()
})

test('starts a new number after four digits', () => {
  expect(addDigit({ digits: '1234' }, '5').digits).toBe('5')
})

test('goes to the next and the previous channel, and wraps at the ends', () => {
  const list = ['a', 'b', 'c']
  expect(stepIn(list, 'a', 1)).toBe('b')
  expect(stepIn(list, 'c', 1)).toBe('a')
  expect(stepIn(list, 'a', -1)).toBe('c')
  expect(stepIn(list, 'x', 1)).toBe('a')
  expect(stepIn(list, 'x', -1)).toBe('c')
  expect(stepIn([], 'a', 1)).toBeUndefined()
})
