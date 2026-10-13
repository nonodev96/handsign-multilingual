import { HandSignClassifier } from 'handsign-multilingual'
import { type HandSignSamplesJSON } from 'handsign-multilingual'
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { type RecordedHand, SamplesContext } from './samples'
import { type SignLanguageId, useSettings } from './settings'

const storageKey = (language: SignLanguageId) => `handsign-demo-samples-${language}`

const load = (language: SignLanguageId) => {
  try {
    const saved = localStorage.getItem(storageKey(language))
    if (saved !== null) return HandSignClassifier.fromJSON(saved)
  } catch {
    // Blocked storage or a damaged file: start again
  }
  return new HandSignClassifier()
}

const save = (language: SignLanguageId, classifier: HandSignClassifier) => {
  try {
    localStorage.setItem(storageKey(language), JSON.stringify(classifier.toJSON(language)))
  } catch {
    // Private mode or full storage: the samples last until the page is closed
  }
}

// The ready-made samples of each sign language (handsign-multilingual/samples): loaded only when they are used
const BASE_SAMPLES: Partial<Record<SignLanguageId, () => Promise<HandSignSamplesJSON>>> = {
  ASL: () => import('handsign-multilingual/samples').then(({ SamplesASL }) => SamplesASL)
}

const recordingsKey = (language: SignLanguageId) => `handsign-demo-recordings-${language}`

const loadRecordings = (language: SignLanguageId): RecordedHand[] => {
  try {
    const saved = JSON.parse(localStorage.getItem(recordingsKey(language)) ?? '[]')
    return Array.isArray(saved) ? saved : []
  } catch {
    return []
  }
}

const saveRecordings = (language: SignLanguageId, recordings: RecordedHand[]) => {
  try {
    localStorage.setItem(recordingsKey(language), JSON.stringify(recordings))
  } catch {
    // Private mode or full storage: they last until the page is closed
  }
}

const round = (value: number) => Math.round(value * 1e5) / 1e5

export function SamplesProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings()
  const language = settings.signLanguage
  const [classifiers] = useState(() => new Map<SignLanguageId, HandSignClassifier>())
  const [recordings] = useState(() => new Map<SignLanguageId, RecordedHand[]>())
  const recordingsOf = useCallback(
    (id: SignLanguageId) => {
      let list = recordings.get(id)
      if (list === undefined) {
        list = loadRecordings(id)
        recordings.set(id, list)
      }
      return list
    },
    [recordings]
  )
  // The classifiers change in place: this counter tells React to render again
  const [version, setVersion] = useState(0)
  const [base, setBase] = useState<Partial<Record<SignLanguageId, HandSignSamplesJSON>>>({})
  const useBase = settings.baseSamples && BASE_SAMPLES[language] !== undefined

  useEffect(() => {
    if (!useBase || base[language] !== undefined) return
    let cancelled = false
    BASE_SAMPLES[language]?.().then((samples) => {
      if (!cancelled) setBase((previous) => ({ ...previous, [language]: samples }))
    })
    return () => {
      cancelled = true
    }
  }, [useBase, base, language])

  const classifierOf = useCallback(
    (id: SignLanguageId) => {
      let classifier = classifiers.get(id)
      if (classifier === undefined) {
        classifier = load(id)
        classifiers.set(id, classifier)
      }
      return classifier
    },
    [classifiers]
  )

  const changed = useCallback(
    (id: SignLanguageId) => {
      save(id, classifierOf(id))
      setVersion((previous) => previous + 1)
    },
    [classifierOf]
  )

  const value = useMemo<SamplesContext>(() => {
    const classifier = classifierOf(language)
    const ready = useBase ? base[language] : undefined
    // Yours on top of the ready-made ones: the recognition uses both
    const recogniser = ready ? new HandSignClassifier({ samples: [...ready.samples, ...classifier.toJSON().samples] }) : classifier
    return {
      classifier: recogniser,
      own: classifier,
      counts: classifier.counts(),
      baseCount: ready?.samples.length ?? 0,
      hasBase: BASE_SAMPLES[language] !== undefined,
      add: (letter, hands) => {
        for (const hand of hands) classifier.add(letter, hand)
        changed(language)
      },
      clear: (letter) => {
        classifier.clear(letter)
        const kept = letter === undefined ? [] : recordingsOf(language).filter((recording) => recording.letter !== letter)
        recordings.set(language, kept)
        saveRecordings(language, kept)
        changed(language)
      },
      importJSON: (text) => {
        const data = JSON.parse(text)
        const id: SignLanguageId = data.language === 'SSL' || data.language === 'ASL' ? data.language : language
        classifiers.set(id, HandSignClassifier.fromJSON(data))
        changed(id)
        return id
      },
      exportJSON: () => JSON.stringify(classifier.toJSON(language)),
      recorded: recordingsOf(language).length,
      record: (letter, hand, { height }) => {
        const list = recordingsOf(language)
        list.push({
          id: crypto.randomUUID?.() ?? `${Date.now()}-${list.length}`,
          letter,
          landmarks: hand.keypoints?.map(({ x, y, z = 0 }) => [round(x / height), round(y / height), round(z / height)]) ?? [],
          handedness: hand.handedness === 'Left' || hand.handedness === 'Right' ? hand.handedness : undefined,
          world: hand.keypoints3D?.map(({ x, y, z = 0 }) => [round(x), round(y), round(z)]),
          person: settings.recorder.trim() || undefined
        })
        saveRecordings(language, list)
      },
      exportRecordings: () =>
        JSON.stringify({
          source: 'handsign-multilingual demo',
          language,
          person: settings.recorder.trim() || undefined,
          aspect: 1,
          description: `Hands recorded in the demo of handsign-multilingual (${new Date().toISOString().slice(0, 10)}): the points in the image divided by its height, MediaPipe's label and the 3D points.`,
          samples: recordingsOf(language)
        })
    }
    // version: the classifier changed in place
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, classifierOf, changed, classifiers, recordings, recordingsOf, version, useBase, base, settings.recorder])

  return <SamplesContext.Provider value={value}>{children}</SamplesContext.Provider>
}
