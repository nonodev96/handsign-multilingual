import { describe, expect, test } from 'vitest'
import { HandMotionTracker, HandSignsSSL } from '../src'
import { evaluateMotion } from './motionSimulation'

// Simulated takes (tests/motionSimulation.ts): the recognition of LL, Ñ and RR must not get worse. The minimums are what
// was measured, minus a margin; raise them when it gets better (pnpm evaluate:motion shows the details)
const results = evaluateMotion((frames) => {
  const tracker = new HandMotionTracker(HandSignsSSL.motions ?? [])
  return frames.map(({ hand, letter, time }) =>
    tracker.update(hand, letter, time)
  )
})
const mean = (list: typeof results) =>
  list.reduce((sum, { rate }) => sum + rate, 0) / list.length

describe('HandMotionTracker in simulated takes (trembling landmarks, blurred letters, 15 to 30 frames per second)', () => {
  const positives = results.filter(({ expected }) => expected !== null)
  const negatives = results.filter(({ expected }) => expected === null)

  test('LL, Ñ and RR are recognised once in 95 % of the takes at least (measured: 98 %)', () => {
    expect(mean(positives)).toBeGreaterThanOrEqual(0.95)
  })

  test.each(positives.map((result) => [result.name, result] as const))(
    '%s: 85 % at least',
    (_name, { rate }) => {
      expect(rate).toBeGreaterThanOrEqual(0.85)
    }
  )

  test.each(negatives.map((result) => [result.name, result] as const))(
    '%s: no letter with movement in 95 % of the takes at least',
    (_name, { rate }) => {
      expect(rate).toBeGreaterThanOrEqual(0.95)
    }
  )
})
