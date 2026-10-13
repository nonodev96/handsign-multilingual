import type { Hand } from '@tensorflow-models/hand-pose-detection'
import {
  type ClassifiedLetter,
  type DetectedHand,
  type FingerPose,
  type HandSignClassifier,
  type LetterScore,
  signingHand
} from 'handsign-multilingual'
import { estimatorFor } from './languages'
import type { Settings } from './settings'

export type Side = 'left' | 'right'

/** What is recognised in one hand of a video frame */
export type Recognition = {
  /** The hand as hand-pose-detection returns it (for the samples) */
  hand: DetectedHand
  side: Side | undefined
  /** Its 21 points in the video, in pixels */
  keypoints: Array<{ x: number; y: number }>
  /** Every letter by the rules, best first (also those under the threshold) */
  rules: LetterScore[]
  /** What each finger is doing, in the frame the letters are described in (a right hand, non-mirrored) */
  fingers: FingerPose[]
  /** The letters of your closest samples, best first (empty without samples) */
  samples: ClassifiedLetter[]
  /** Who decided the letter */
  source: 'rules' | 'samples'
  /** The threshold the letter had to reach (that of the rules or that of your samples) */
  threshold: number
  /** The letters that reach the threshold, best first: what the motion tracker gets (the base letter may come second) */
  letters: LetterScore[]
  /** The letter recognised (null: none reaches its threshold) and its score */
  letter: string | null
  score: number
  /**
   * Whether the arrows of the finger directions have to be flipped to match what you see: they are described for a
   * right hand in a non-mirrored image
   */
  flipArrows: boolean
}

/** Your samples decide when there are samples of at least two letters (with one letter, everything would be that) */
export const samplesCanDecide = (classifier: HandSignClassifier) => Object.keys(classifier.counts()).length >= 2

export function recognize(hand: Hand, settings: Settings, classifier: HandSignClassifier): Recognition {
  const { letters: rules, fingers } = estimatorFor(settings.signLanguage).estimate(hand)
  const samples = classifier.size > 0 ? classifier.predict(hand) : []
  // "My samples" needs samples of two letters at least (without samples nothing would be recognised, and with one letter
  // everything would be that letter): until then the rules decide
  const useSamples = settings.recognizer !== 'rules' && samplesCanDecide(classifier)
  const best = useSamples ? samples[0] : rules[0]
  const threshold = useSamples ? settings.minShare : settings.minScore
  // The video goes to hand-pose-detection as it comes from the camera (not mirrored)
  const side = signingHand(hand, { mirrored: false })
  return {
    hand,
    side,
    keypoints: hand.keypoints.map(({ x, y }) => ({ x, y })),
    rules,
    fingers,
    samples,
    source: useSamples ? 'samples' : 'rules',
    threshold,
    letters: (useSamples ? samples : rules).filter(({ score }) => score >= threshold),
    letter: best !== undefined && best.score >= threshold ? best.letter : null,
    score: best?.score ?? 0,
    // On screen the video is mirrored or not; the letters are described for a hand labelled "Left" (see
    // canonicalLandmarks): flip when exactly one of the two is mirrored
    flipArrows: settings.mirror !== (hand.handedness === 'Right')
  }
}

/**
 * Steadies the letter of each hand: the one most frames agree on among the last ones, so it does not flicker while the
 * hand moves between letters
 */
export class LetterSmoother {
  private history = new Map<string, Array<string | null>>()

  constructor(
    private readonly frames = 8,
    private readonly agreement = 0.6
  ) {}

  push(key: string, letter: string | null): string | null {
    const history = this.history.get(key) ?? []
    history.push(letter)
    if (history.length > this.frames) history.shift()
    this.history.set(key, history)
    const votes = new Map<string, number>()
    for (const value of history) if (value !== null) votes.set(value, (votes.get(value) ?? 0) + 1)
    let best: string | null = null
    let bestVotes = 0
    for (const [value, count] of votes) {
      if (count > bestVotes) {
        best = value
        bestVotes = count
      }
    }
    return bestVotes >= Math.ceil(this.frames * this.agreement) ? best : null
  }

  forget(keys: string[]) {
    for (const key of [...this.history.keys()]) if (!keys.includes(key)) this.history.delete(key)
  }
}

/**
 * A key for each hand that holds between frames: its side (the order of the hands can change). MediaPipe can give the
 * same side to two hands (the palm of one and the back of the other): then the second one is "right-2"
 */
export function handKeys(recognitions: Recognition[]): string[] {
  const seen = new Map<string, number>()
  return recognitions.map((recognition) => {
    const side = recognition.side ?? 'hand'
    const count = (seen.get(side) ?? 0) + 1
    seen.set(side, count)
    return count === 1 ? side : `${side}-${count}`
  })
}
