import { describe, expect, test } from 'vitest'
import { type DetectedHand, HandSignClassifier } from '../src'
import { type SyntheticHand, detectedHand } from './syntheticHand'

const folded = { curl: 'folded', angle: 90 } as const
const straight = (angle: number) => ({ curl: 'straight', angle }) as const
const L: SyntheticHand = {
  thumb: straight(45),
  index: straight(90),
  middle: folded,
  ring: folded,
  pinky: folded
}
const Y: SyntheticHand = {
  thumb: straight(45),
  index: folded,
  middle: folded,
  ring: folded,
  pinky: straight(120)
}
const V: SyntheticHand = {
  thumb: folded,
  index: straight(80),
  middle: straight(100),
  ring: folded,
  pinky: folded
}

// The same hand a bit different each time, as from a camera
const jitter = (hand: SyntheticHand, seed: number): SyntheticHand =>
  Object.fromEntries(
    Object.entries(hand).map(([finger, { curl, angle }], i) => [
      finger,
      { curl, angle: angle + Math.sin(seed * 7 + i) * 6 }
    ])
  ) as SyntheticHand

const moved = (
  hand: DetectedHand,
  dx: number,
  dy: number,
  scale: number
): DetectedHand => ({
  ...hand,
  keypoints3D: hand.keypoints3D?.map(({ x, y, z = 0 }) => ({
    x: x * scale + dx,
    y: y * scale + dy,
    z: z * scale
  }))
})

const trained = () => {
  const classifier = new HandSignClassifier({ k: 3 })
  for (let seed = 0; seed < 5; seed++) {
    classifier.add('L', detectedHand(jitter(L, seed)))
    classifier.add('Y', detectedHand(jitter(Y, seed)))
    classifier.add('V', detectedHand(jitter(V, seed)))
  }
  return classifier
}

describe('HandSignClassifier', () => {
  test('the features do not depend on where the hand is or how big it looks', () => {
    const hand = detectedHand(L)
    expect(HandSignClassifier.features(moved(hand, 120, -40, 3))).toEqual(
      HandSignClassifier.features(hand)
    )
  })

  test('the left hand (or a mirrored image) gives the same features as the right one', () => {
    expect(
      HandSignClassifier.features(detectedHand(L, { mirrored: true }))
    ).toEqual(HandSignClassifier.features(detectedHand(L)))
  })

  test('recognises the letter of the closest samples', () => {
    const classifier = trained()
    for (const [letter, hand] of Object.entries({ L, Y, V })) {
      const [best] = classifier.predict(detectedHand(jitter(hand, 42)))
      expect(best.letter).toBe(letter)
      expect(best.score).toBeGreaterThan(0.5)
    }
  })

  test('says how far the hand is from the closest sample of each letter', () => {
    const [best] = trained().predict(detectedHand(L))
    expect(best.distance).toBeGreaterThanOrEqual(0)
    expect(best.distance).toBeLessThan(0.5)
  })

  test('without samples it recognises nothing', () => {
    expect(new HandSignClassifier().predict(detectedHand(L))).toEqual([])
  })

  test('counts and clears the samples of a letter or all of them', () => {
    const classifier = trained()
    expect(classifier.counts()).toEqual({ L: 5, Y: 5, V: 5 })
    classifier.clear('Y')
    expect(classifier.counts()).toEqual({ L: 5, V: 5 })
    classifier.clear()
    expect(classifier.size).toBe(0)
  })

  test('cross-validation: each sample recognised from the others', () => {
    const { accuracy, total, confusion } = trained().crossValidate()
    expect(total).toBe(15)
    expect(accuracy).toBe(1)
    expect(confusion.L).toEqual({ L: 5 })
  })

  test('saves and loads the samples as JSON', () => {
    const classifier = trained()
    const json = JSON.stringify(classifier.toJSON('ASL'))
    const loaded = HandSignClassifier.fromJSON(json, { k: 3 })
    expect(loaded.counts()).toEqual(classifier.counts())
    expect(loaded.predict(detectedHand(V))).toEqual(
      classifier.predict(detectedHand(V))
    )
    expect(JSON.parse(json)).toMatchObject({
      format: 'handsign-multilingual/samples',
      version: 1,
      language: 'ASL'
    })
  })

  test('rejects JSON that is not a samples file', () => {
    expect(() => HandSignClassifier.fromJSON('{"samples": 3}')).toThrow(
      'Not a handsign-multilingual samples file'
    )
  })
})
