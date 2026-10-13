import { describe, expect, test } from 'vitest'
import { HandSignsASL, HandSignsSSL } from '../src'
import { SignImagesASL, SignImagesSSL } from '../src/images'

describe.each([
  ['ASL', HandSignsASL, SignImagesASL],
  ['SSL', HandSignsSSL, SignImagesSSL]
] as const)('%s images', (_language, { signs }, images) => {
  test('every letter it recognises has its images', () => {
    for (const { name } of Object.values(signs) as unknown as Array<{
      name: string
    }>) {
      expect(images[name], name).toMatchObject({
        letter: name,
        sign: expect.any(String),
        hand: expect.any(String)
      })
    }
  })
})

test('the Spanish alphabet also shows LL, Ñ and RR, although they are not recognised', () => {
  expect(Object.keys(SignImagesSSL)).toEqual(
    expect.arrayContaining(['LL', 'Ñ', 'RR'])
  )
  expect(Object.keys(SignImagesSSL)).toHaveLength(29)
})
