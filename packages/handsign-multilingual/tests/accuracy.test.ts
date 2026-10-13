import { describe, expect, test } from 'vitest'
import type { HandSignSample } from '../src'
import { evaluateRules, evaluateSamples, loadDataset } from './evaluation'

// Real hands (ASLNow!, data/asl-now.json): the recognition must not get worse. The minimums are what was measured,
// minus a margin; raise them when it gets better (pnpm evaluate shows the details)
const aslNow = loadDataset(new URL('../data/asl-now.json', import.meta.url))

describe('ASLNow! (real hands, American Sign Language)', () => {
  test('rules: the best letter is right in 36 % of the samples at least (measured: 38 %)', () => {
    expect(evaluateRules(aslNow).top.accuracy).toBeGreaterThanOrEqual(0.36)
  })

  test('samples, one byte per value as in handsign-multilingual/samples: 90 % at least (measured: 92 %)', () => {
    const quantised = (samples: HandSignSample[]) =>
      samples.map((sample) => ({
        ...sample,
        features: sample.features.map((value) => Math.round(value * 40) / 40)
      }))
    expect(
      evaluateSamples(aslNow, { groupDistance: 0.3, reduce: quantised })
        .accuracy
    ).toBeGreaterThanOrEqual(0.9)
  })

  test('samples: 90 % right at least, keeping the takes of the same moment together (measured: 92 %)', () => {
    expect(
      evaluateSamples(aslNow, { groupDistance: 0.3 }).accuracy
    ).toBeGreaterThanOrEqual(0.9)
  })
})
