import {
  type CurlName,
  type DirectionName,
  Finger,
  FingerCurl,
  FingerDirection,
  type FingerName,
  type FingerPose,
  type GestureDescription,
  GestureEstimator
} from './fingerpose'
import { type DetectedHand, canonicalLandmarks } from './hand'
import type { HandSignLang } from './types'

export type { CurlName, DirectionName, FingerName, FingerPose }

/** A letter and how well the hand matches it, from 0 to 1 (1: everything the letter describes matches) */
export type LetterScore = { letter: string; score: number }

/** What a letter expects of a finger: its curls and directions, with their weights */
export type ExpectedFinger = {
  finger: FingerName
  curls: Array<{ curl: CurlName; weight: number }>
  directions: Array<{ direction: DirectionName; weight: number }>
}

export type HandSignEstimate = {
  /** The letters that score at least `minScore`, best first */
  letters: LetterScore[]
  /** What each finger is doing, in the frame the letters are described in */
  fingers: FingerPose[]
}

/** What a letter expects of each finger: its curls and directions, with their weights */
export function describeSign(sign: GestureDescription): ExpectedFinger[] {
  const { curls, directions } = sign
  return Finger.all.map((finger) => ({
    finger: Finger.getName(finger),
    curls: (curls[finger] ?? []).map(([curl, weight]) => ({
      curl: FingerCurl.getName(curl),
      weight
    })),
    directions: (directions[finger] ?? []).map(([direction, weight]) => ({
      direction: FingerDirection.getName(direction),
      weight
    }))
  }))
}

// The score of a hand that matches everything the letter describes (GestureEstimator scores from 0 to 10)
const perfectScore = (sign: GestureDescription) => {
  const first = (expected: Record<number, Array<[number, number]>>) =>
    Finger.all.map((finger) => expected[finger]?.[0]?.[0] ?? -1)
  return sign.matchAgainst(first(sign.curls), first(sign.directions))
}

/**
 * Recognises the letters of a language in the hands hand-pose-detection finds. It takes care of what GestureEstimator needs:
 * landmarks as arrays, in the frame the letters are described in (`canonicalLandmarks`, so both hands and mirrored
 * input work), and scores from 0 to 1
 */
export function createHandSignEstimator(
  language: HandSignLang,
  { minScore = 0.8 }: { minScore?: number } = {}
) {
  const signs = Object.values(language.signs)
  const estimator = new GestureEstimator(signs)
  const perfect = new Map(signs.map((sign) => [sign.name, perfectScore(sign)]))

  return {
    /** The letters this estimator knows */
    letters: signs.map(({ name }) => name),

    estimate(
      hand: DetectedHand,
      options: { minScore?: number } = {}
    ): HandSignEstimate {
      const threshold = options.minScore ?? minScore
      const { gestures, fingers } = estimator.estimate(
        canonicalLandmarks(hand),
        0
      )
      const letters = gestures
        .map(({ name, score }) => ({
          letter: name,
          score: Math.min(1, Math.max(0, score / (perfect.get(name) ?? 10)))
        }))
        .filter(({ score }) => score >= threshold)
        .sort((a, b) => b.score - a.score)
      return { letters, fingers }
    }
  }
}

export type HandSignEstimator = ReturnType<typeof createHandSignEstimator>
