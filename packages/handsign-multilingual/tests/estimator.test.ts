import { describe, expect, test } from 'vitest'
import {
  GestureEstimator,
  HandSignsASL,
  HandSignsSSL,
  createHandSignEstimator,
  describeSign
} from '../src'
import {
  type SyntheticHand,
  detectedHand,
  syntheticLandmarks
} from './syntheticHand'

const folded = { curl: 'folded', angle: 90 } as const
const straight = (angle: number) => ({ curl: 'straight', angle }) as const
const HANDS: Record<string, SyntheticHand> = {
  L: {
    thumb: straight(45),
    index: straight(90),
    middle: folded,
    ring: folded,
    pinky: folded
  },
  B: {
    thumb: { curl: 'bent', angle: 100 },
    index: straight(90),
    middle: straight(90),
    ring: straight(90),
    pinky: straight(90)
  },
  Y: {
    thumb: straight(45),
    index: folded,
    middle: folded,
    ring: folded,
    pinky: straight(120)
  }
}

describe('createHandSignEstimator', () => {
  const estimator = createHandSignEstimator(HandSignsASL)

  test.each(Object.keys(HANDS))(
    'recognises %s, scored from 0 to 1',
    (letter) => {
      const { letters } = estimator.estimate(detectedHand(HANDS[letter]))
      expect(letters[0].letter).toBe(letter)
      expect(letters[0].score).toBeGreaterThan(0.9)
      expect(letters[0].score).toBeLessThanOrEqual(1)
    }
  )

  test.each(Object.keys(HANDS))(
    'recognises %s with the left hand or a mirrored image too',
    (letter) => {
      const right = estimator.estimate(detectedHand(HANDS[letter]))
      expect(
        estimator.estimate(detectedHand(HANDS[letter], { mirrored: true }))
      ).toEqual(right)
    }
  )

  // What went wrong before: the letters describe a right hand in a non-mirrored image
  test('GestureEstimator alone scores the mirrored hand lower: the sideways directions no longer match', () => {
    const gestureEstimator = new GestureEstimator(
      Object.values(HandSignsASL.signs)
    )
    const scoreOfL = (landmarks: number[][]) =>
      gestureEstimator
        .estimate(landmarks, 0)
        .gestures.find(({ name }) => name === 'L')?.score ?? 0
    const landmarks = syntheticLandmarks(HANDS.L)
    const mirrored = landmarks.map(([x, y, z]) => [-x, y, z])
    expect(scoreOfL(mirrored)).toBeLessThan(scoreOfL(landmarks))
  })

  test('only returns the letters that reach minScore, best first', () => {
    const { letters } = estimator.estimate(detectedHand(HANDS.L), {
      minScore: 0.7
    })
    expect(letters.length).toBeGreaterThan(1)
    expect(letters.every(({ score }) => score >= 0.7)).toBe(true)
    expect(letters.map(({ score }) => score)).toEqual(
      [...letters.map(({ score }) => score)].sort((a, b) => b - a)
    )
  })

  test('says what each finger is doing', () => {
    const { fingers } = estimator.estimate(detectedHand(HANDS.L))
    expect(fingers).toEqual([
      { finger: 'Thumb', curl: 'NoCurl', direction: 'DiagonalUpRight' },
      { finger: 'Index', curl: 'NoCurl', direction: 'VerticalUp' },
      { finger: 'Middle', curl: 'FullCurl', direction: 'VerticalUp' },
      { finger: 'Ring', curl: 'FullCurl', direction: 'VerticalUp' },
      { finger: 'Pinky', curl: 'FullCurl', direction: 'VerticalUp' }
    ])
  })

  test('lists the letters it knows', () => {
    expect(createHandSignEstimator(HandSignsSSL).letters).toHaveLength(26)
  })
})

describe('describeSign', () => {
  test('what a letter expects of each finger, with the weights', () => {
    const [thumb, index] = describeSign(HandSignsASL.signs.lSign)
    expect(thumb).toEqual({
      finger: 'Thumb',
      curls: [{ curl: 'NoCurl', weight: 1 }],
      directions: [{ direction: 'DiagonalUpRight', weight: 0.7 }]
    })
    expect(index.curls).toEqual([{ curl: 'NoCurl', weight: 1 }])
  })
})
