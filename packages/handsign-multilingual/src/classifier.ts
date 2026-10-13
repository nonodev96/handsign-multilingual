import type { LetterScore } from './estimator'
import { type DetectedHand, canonicalLandmarks } from './hand'

/** A recorded example: the letter and the hand, as `HandSignClassifier.features` describes it */
export type HandSignSample = { letter: string; features: number[] }

/** The samples of a classifier as JSON, to save them and load them later (`toJSON` and `fromJSON`) */
export type HandSignSamplesJSON = {
  format: 'handsign-multilingual/samples'
  version: 1
  language?: string
  samples: HandSignSample[]
}

/** A letter the classifier recognises: its score (0 to 1) and how far the hand is from its closest sample */
export type ClassifiedLetter = LetterScore & { distance: number }

export type CrossValidation = {
  /** Share of samples whose letter is recognised from all the other samples (0 to 1) */
  accuracy: number
  total: number
  /** confusion[expected][recognised]: how many samples of `expected` were recognised as `recognised` */
  confusion: Record<string, Record<string, number>>
}

const WRIST = 0
const MIDDLE_FINGER_BASE = 9
const PRECISION = 1e4

const distance = (a: number[], b: number[]) => {
  let sum = 0
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2
  return Math.sqrt(sum)
}

/**
 * Recognises letters by comparing the hand with recorded examples (k nearest neighbours), instead of with fixed rules.
 * A few samples of each letter from the person who will sign (5 to 20) are usually enough, and it copes with how each
 * person makes the letters, the camera angle and letters that rules cannot tell apart
 */
export class HandSignClassifier {
  readonly k: number
  private samples: HandSignSample[] = []

  constructor({
    k = 5,
    samples = []
  }: { k?: number; samples?: HandSignSample[] } = {}) {
    this.k = k
    for (const sample of samples)
      this.samples.push({
        letter: sample.letter,
        features: [...sample.features]
      })
  }

  /**
   * The hand as numbers to compare: its landmarks in the frame the letters are described in (both hands alike), moved
   * so the wrist is at 0 and scaled by the size of the palm (wrist to the base of the middle finger). The orientation is
   * kept: some letters only differ in it
   */
  static features(hand: DetectedHand): number[] {
    const landmarks = canonicalLandmarks(hand)
    const [wx, wy, wz] = landmarks[WRIST]
    const [mx, my, mz] = landmarks[MIDDLE_FINGER_BASE]
    const palm = Math.hypot(mx - wx, my - wy, mz - wz) || 1
    return landmarks.flatMap(([x, y, z]) =>
      [x - wx, y - wy, z - wz].map(
        (value) => Math.round((value / palm) * PRECISION) / PRECISION
      )
    )
  }

  /** Records a sample of the letter from the hand */
  add(letter: string, hand: DetectedHand): HandSignSample {
    const sample = { letter, features: HandSignClassifier.features(hand) }
    this.samples.push(sample)
    return sample
  }

  /** Removes the samples of a letter, or all of them */
  clear(letter?: string) {
    this.samples =
      letter === undefined
        ? []
        : this.samples.filter((sample) => sample.letter !== letter)
  }

  get size() {
    return this.samples.length
  }

  /** How many samples there are of each letter */
  counts(): Record<string, number> {
    const counts: Record<string, number> = {}
    for (const { letter } of this.samples)
      counts[letter] = (counts[letter] ?? 0) + 1
    return counts
  }

  /**
   * The letters of the k samples closest to the hand, best first. Each score is that letter's share of the vote (closer
   * samples weigh more); `distance` is how far the hand is from the closest sample of the letter, to discard hands that
   * are far from every sample
   */
  predict(hand: DetectedHand): ClassifiedLetter[] {
    return this.classify(HandSignClassifier.features(hand), this.samples)
  }

  /** Leave-one-out: recognises each sample from all the others, to know how well the samples tell the letters apart */
  crossValidate(): CrossValidation {
    const confusion: Record<string, Record<string, number>> = {}
    let correct = 0
    this.samples.forEach((sample, index) => {
      const others = this.samples.filter((_, other) => other !== index)
      const recognised =
        this.classify(sample.features, others)[0]?.letter ?? '?'
      confusion[sample.letter] ??= {}
      confusion[sample.letter][recognised] =
        (confusion[sample.letter][recognised] ?? 0) + 1
      if (recognised === sample.letter) correct++
    })
    const total = this.samples.length
    return { accuracy: total === 0 ? 0 : correct / total, total, confusion }
  }

  toJSON(language?: string): HandSignSamplesJSON {
    return {
      format: 'handsign-multilingual/samples',
      version: 1,
      language,
      samples: this.samples
    }
  }

  static fromJSON(
    json: HandSignSamplesJSON | string,
    options: { k?: number } = {}
  ): HandSignClassifier {
    const data = (
      typeof json === 'string' ? JSON.parse(json) : json
    ) as HandSignSamplesJSON
    if (
      data?.format !== 'handsign-multilingual/samples' ||
      !Array.isArray(data.samples)
    ) {
      throw new Error('Not a handsign-multilingual samples file')
    }
    return new HandSignClassifier({ ...options, samples: data.samples })
  }

  private classify(
    features: number[],
    samples: HandSignSample[]
  ): ClassifiedLetter[] {
    if (samples.length === 0) return []
    const nearest = samples
      .map((sample) => ({
        letter: sample.letter,
        distance: distance(features, sample.features)
      }))
      .sort((a, b) => a.distance - b.distance)
    const votes = new Map<string, number>()
    let total = 0
    for (const { letter, distance } of nearest.slice(0, this.k)) {
      const weight = 1 / (distance + 1e-6)
      votes.set(letter, (votes.get(letter) ?? 0) + weight)
      total += weight
    }
    const closest = new Map<string, number>()
    for (const { letter, distance } of nearest)
      if (!closest.has(letter)) closest.set(letter, distance)
    return [...votes]
      .map(([letter, weight]) => ({
        letter,
        score: weight / total,
        distance: closest.get(letter) ?? Number.POSITIVE_INFINITY
      }))
      .sort((a, b) => b.score - a.score)
  }
}
