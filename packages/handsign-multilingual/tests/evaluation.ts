import { readFileSync } from 'node:fs'
import {
  type DetectedHand,
  type HandSignSample,
  type HandSignLang,
  HandSignClassifier,
  HandSignsASL,
  HandSignsSSL,
  createHandSignEstimator
} from '../src'

/**
 * A recorded sample: the letter and the 21 landmarks of the hand in the image (x and y normalised by the width and the
 * height of the image, z with the scale of x, as the ASLNow! dataset has them). The demo also saves MediaPipe's label
 * and the 3D landmarks (`world`, in meters), which are the ones the live recognition uses
 */
export type DatasetSample = {
  id: string
  letter: string
  landmarks: number[][]
  handedness?: 'Left' | 'Right'
  world?: number[][]
  /** Who recorded it: with several people, each one is recognised from the samples of the others */
  person?: string
}

export type Dataset = {
  source: string
  license?: string
  language: 'ASL' | 'SSL'
  /** Width / height of the images: x is scaled by it, so that both axes have the same unit */
  aspect: number
  samples: DatasetSample[]
}

export const LANGUAGES: Record<Dataset['language'], HandSignLang> = {
  ASL: HandSignsASL,
  SSL: HandSignsSSL
}

export function loadDataset(path: string | URL): Dataset {
  return JSON.parse(readFileSync(path, 'utf8')) as Dataset
}

/** The sample as hand-pose-detection would give it; without a label, canonicalLandmarks infers it from its shape */
export function toHand(
  sample: DatasetSample,
  { aspect }: Dataset
): DetectedHand {
  return {
    keypoints: sample.landmarks.map(([x, y, z]) => ({
      x: x * aspect,
      y,
      z: z * aspect
    })),
    keypoints3D: sample.world?.map(([x, y, z]) => ({ x, y, z })),
    handedness: sample.handedness
  }
}

export type Report = {
  total: number
  correct: number
  accuracy: number
  /** By letter: how many samples and how many recognised */
  letters: Record<string, { total: number; correct: number }>
  /** The most frequent mistakes */
  confusions: Array<{ expected: string; recognised: string; count: number }>
}

function report(
  results: Array<{ expected: string; recognised: string | null }>
): Report {
  const letters: Report['letters'] = {}
  const mistakes = new Map<string, number>()
  let correct = 0
  for (const { expected, recognised } of results) {
    letters[expected] ??= { total: 0, correct: 0 }
    letters[expected].total++
    if (recognised === expected) {
      letters[expected].correct++
      correct++
    } else {
      const key = `${expected}→${recognised ?? '—'}`
      mistakes.set(key, (mistakes.get(key) ?? 0) + 1)
    }
  }
  const confusions = [...mistakes]
    .map(([key, count]) => {
      const [expected, recognised] = key.split('→')
      return { expected, recognised, count }
    })
    .sort((a, b) => b.count - a.count)
  return {
    total: results.length,
    correct,
    accuracy: results.length ? correct / results.length : 0,
    letters,
    confusions
  }
}

/**
 * The rules of the library: the best letter of each sample (`top`), and how often they reach `minScore` (`coverage`)
 * and are right when they do (`confident`)
 */
export function evaluateRules(
  dataset: Dataset,
  { minScore = 0.8 }: { minScore?: number } = {}
) {
  const estimator = createHandSignEstimator(LANGUAGES[dataset.language], {
    minScore: 0
  })
  const best = dataset.samples.map((sample) => ({
    expected: sample.letter,
    best: estimator.estimate(toHand(sample, dataset)).letters[0]
  }))
  const sure = best.filter(
    ({ best }) => best !== undefined && best.score >= minScore
  )
  return {
    top: report(
      best.map(({ expected, best }) => ({
        expected,
        recognised: best?.letter ?? null
      }))
    ),
    coverage: sure.length / best.length,
    confident: report(
      sure.map(({ expected, best }) => ({
        expected,
        recognised: best?.letter ?? null
      }))
    )
  }
}

const distance = (a: number[], b: number[]) => {
  let sum = 0
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2
  return Math.sqrt(sum)
}

/**
 * Samples (HandSignClassifier) by k-fold cross-validation. Samples of the same letter closer than `groupDistance` are
 * kept in the same fold (with `groupDistance` 0, each on its own): they are usually takes of the same moment of the same
 * person, and recognising one from the other would say little about a new person
 */
export function evaluateSamples(
  dataset: Dataset,
  {
    folds = 5,
    k = 5,
    groupDistance = 0.3,
    reduce = (samples: HandSignSample[]) => samples
  }: {
    folds?: number
    k?: number
    groupDistance?: number
    /** Keeps fewer samples (only of each training fold, so that it is measured honestly) */
    reduce?: (samples: HandSignSample[]) => HandSignSample[]
  } = {}
): Report {
  const hands = dataset.samples.map((sample) => toHand(sample, dataset))
  const features = hands.map((hand) => HandSignClassifier.features(hand))
  const parent = features.map((_, i) => i)
  const find = (sample: number): number => {
    let root = sample
    while (parent[root] !== root) {
      parent[root] = parent[parent[root]]
      root = parent[root]
    }
    return root
  }
  if (groupDistance > 0) {
    for (let i = 0; i < features.length; i++) {
      for (let j = i + 1; j < features.length; j++) {
        if (
          dataset.samples[i].letter === dataset.samples[j].letter &&
          distance(features[i], features[j]) < groupDistance
        ) {
          parent[find(i)] = find(j)
        }
      }
    }
  }
  const groups = [...new Set(features.map((_, i) => find(i)))]
  const foldOfGroup = new Map(
    groups.map((group, index) => [group, index % folds])
  )
  // With samples of several people, each person is a fold: recognising someone from the samples of the others is what
  // a new person will find
  const people = [...new Set(dataset.samples.map(({ person }) => person))]
  const byPerson = people.length >= 2 && !people.includes(undefined)
  const foldOf = byPerson
    ? dataset.samples.map(({ person }) => people.indexOf(person))
    : features.map((_, i) => foldOfGroup.get(find(i)) ?? 0)
  const foldCount = byPerson ? people.length : folds

  const results: Array<{ expected: string; recognised: string | null }> = []
  for (let fold = 0; fold < foldCount; fold++) {
    const classifier = new HandSignClassifier({
      k,
      samples: reduce(
        dataset.samples.flatMap((sample, i) =>
          foldOf[i] === fold
            ? []
            : [{ letter: sample.letter, features: features[i] }]
        )
      )
    })
    dataset.samples.forEach((sample, i) => {
      if (foldOf[i] === fold)
        results.push({
          expected: sample.letter,
          recognised: classifier.predict(hands[i])[0]?.letter ?? null
        })
    })
  }
  return report(results)
}

/** Several datasets of the same language as one (for example, the recordings of several people) */
export function mergeDatasets(datasets: Dataset[]): Dataset {
  const [first] = datasets
  if (datasets.some(({ language }) => language !== first.language))
    throw new Error('The datasets are of different languages')
  // Each one with its own aspect: brought to that of the first
  return {
    source: datasets.map(({ source }) => source).join(' + '),
    language: first.language,
    aspect: first.aspect,
    samples: datasets.flatMap((dataset) =>
      dataset.samples.map((sample) => ({
        ...sample,
        landmarks: sample.landmarks.map(([x, y, z]) => [
          (x * dataset.aspect) / first.aspect,
          y,
          (z * dataset.aspect) / first.aspect
        ])
      }))
    )
  }
}
