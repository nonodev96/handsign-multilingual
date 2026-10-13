import { describe, expect, test } from 'vitest'
import { HandSignClassifier } from '../src'
import { SamplesASL } from '../src/samples'
import { loadDataset, toHand } from './evaluation'

const aslNow = loadDataset(new URL('../data/asl-now.json', import.meta.url))
const SCALE = 40

describe('SamplesASL (handsign-multilingual/samples)', () => {
  test('every sample of ASLNow!, with its letter: the 26 letters', () => {
    expect(SamplesASL).toMatchObject({
      format: 'handsign-multilingual/samples',
      version: 1,
      language: 'ASL'
    })
    expect(SamplesASL.samples).toHaveLength(aslNow.samples.length)
    expect(SamplesASL.samples.map(({ letter }) => letter)).toEqual(
      aslNow.samples.map(({ letter }) => letter)
    )
    expect(new Set(SamplesASL.samples.map(({ letter }) => letter)).size).toBe(
      26
    )
  })

  // If the features change (HandSignClassifier.features), the samples have to be built again: pnpm build:samples
  test('they are the features of the data, one byte per value: run "pnpm build:samples" if this fails', () => {
    aslNow.samples.forEach((sample, i) => {
      const expected = HandSignClassifier.features(toHand(sample, aslNow)).map(
        (
          value // + 0: as one byte there is no -0
        ) => Math.round(value * SCALE) / SCALE + 0
      )
      expect(SamplesASL.samples[i].features).toEqual(expected)
    })
  })

  test('a classifier with them recognises the hands they come from', () => {
    const classifier = HandSignClassifier.fromJSON(SamplesASL)
    const right = aslNow.samples.filter(
      (sample) =>
        classifier.predict(toHand(sample, aslNow))[0]?.letter === sample.letter
    )
    expect(right.length / aslNow.samples.length).toBeGreaterThan(0.97)
  })
})
