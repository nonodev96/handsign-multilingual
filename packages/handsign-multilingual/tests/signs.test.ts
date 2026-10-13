import { describe, expect, test } from 'vitest'
import {
  Finger,
  type GestureDescription,
  HandSignsASL,
  HandSignsSSL
} from '../src'

const LANGUAGES = [
  ['ASL', HandSignsASL],
  ['SSL', HandSignsSSL]
] as const

// The pose a letter describes, taking the first curl and direction listed for each finger
const idealPose = (sign: GestureDescription) => ({
  curls: Finger.all.map((finger) => sign.curls[finger][0][0]),
  directions: Finger.all.map((finger) => sign.directions[finger][0][0])
})

describe.each(LANGUAGES)('%s', (_language, { signs }) => {
  const described = Object.values(signs)

  test.each(described.map((sign) => [sign.name, sign] as const))(
    '%s describes the curl and the direction of the five fingers',
    (_name, sign) => {
      for (const finger of Finger.all) {
        expect(
          sign.curls[finger],
          `curl of the ${Finger.getName(finger)}`
        ).toBeDefined()
        expect(
          sign.directions[finger],
          `direction of the ${Finger.getName(finger)}`
        ).toBeDefined()
      }
    }
  )

  test('every letter has its own name', () => {
    const names = described.map(({ name }) => name)
    expect(new Set(names).size).toBe(names.length)
  })

  // Two letters with the same description always get the same score: the estimator would report both
  test('no two letters have the same description', () => {
    const byDescription = new Map<string, string>()
    for (const sign of described) {
      const key = JSON.stringify(
        Finger.all.map((finger) => [
          sign.curls[finger],
          sign.directions[finger]
        ])
      )
      expect(
        byDescription.get(key),
        `${sign.name} is described as ${byDescription.get(key)}`
      ).toBeUndefined()
      byDescription.set(key, sign.name)
    }
  })

  test.each(described.map((sign) => [sign.name, sign] as const))(
    'the pose %s describes is recognised as that letter, above every other one',
    (name, sign) => {
      const { curls, directions } = idealPose(sign)
      const scores = described.map((other) => ({
        name: other.name,
        score: other.matchAgainst(curls, directions)
      }))
      const best = Math.max(...scores.map(({ score }) => score))
      expect(
        scores.filter(({ score }) => score === best).map(({ name }) => name)
      ).toEqual([name])
    }
  )

  // The descriptions score from 0 to 10. With heavier weights, a letter would also win poses that only partly match it
  test.each(described.map((sign) => [sign.name, sign] as const))(
    'the pose %s describes scores about 8.5, like every other letter',
    (_name, sign) => {
      const { curls, directions } = idealPose(sign)
      const score = sign.matchAgainst(curls, directions)
      expect(score).toBeGreaterThanOrEqual(8)
      expect(score).toBeLessThanOrEqual(9)
    }
  )
})
