import type { DetectedHand, HandSignClassifier } from 'handsign-multilingual'
import { createContext, useContext } from 'react'
import type { SignLanguageId } from './settings'

export type SamplesContext = {
  /** The classifier that recognises: your samples of the sign language you are using and, if on, the ready-made ones */
  classifier: HandSignClassifier
  /** Only your samples (to count them, evaluate them and save them) */
  own: HandSignClassifier
  counts: Record<string, number>
  /** How many ready-made samples the recognition is using (0: none, or they are off or still loading) */
  baseCount: number
  /** Whether the sign language has ready-made samples */
  hasBase: boolean
  add: (letter: string, hands: DetectedHand[]) => void
  clear: (letter?: string) => void
  /** Loads a samples file (it replaces the samples of its language) */
  importJSON: (text: string) => SignLanguageId
  exportJSON: () => string
  /** How many hands are recorded with their points, to measure the recognition (pnpm evaluate) */
  recorded: number
  /** Keeps the points of a hand: those of the image (in a video of that size) and the 3D ones */
  record: (letter: string, hand: DetectedHand, size: { width: number; height: number }) => void
  /** The recorded hands, as the datasets of the library (packages/handsign-multilingual/data) */
  exportRecordings: () => string
}

/** A recorded hand, as the datasets of the library (see packages/handsign-multilingual/tests/evaluation.ts) */
export type RecordedHand = {
  id: string
  letter: string
  /** In the image, divided by its height: x and y in the same unit */
  landmarks: number[][]
  handedness?: 'Left' | 'Right'
  /** MediaPipe's 3D points, in meters */
  world?: number[][]
  /** Who recorded it (to measure with people the samples do not come from) */
  person?: string
}

export const SamplesContext = createContext<SamplesContext | null>(null)

export function useSamples() {
  const context = useContext(SamplesContext)
  if (context === null) throw new Error('useSamples needs a SamplesProvider')
  return context
}
