import {
  type HandSignEstimator,
  type HandSignLang,
  HandSignsASL,
  HandSignsSSL,
  createHandSignEstimator
} from 'handsign-multilingual'
import { type SignImage, SignImagesASL, SignImagesSSL } from 'handsign-multilingual/images'
import type { SignLanguageId, Text } from './settings'

type GestureDescription = HandSignLang['signs'][string]

export type SignLanguage = {
  id: SignLanguageId
  name: Text
  signs: HandSignLang
  images: Record<string, SignImage>
  /** The letters in alphabet order, also those the rules do not recognise */
  alphabet: string[]
  /** The letter of each fingerpose description, by its name ('A', 'Ñ'…) */
  descriptions: Record<string, GestureDescription>
  /** Letters that are not recognised, and why */
  notRecognised: Record<string, Text>
  /** The letters made with a movement: their base letter (the handshape) and how they move */
  motions: Record<string, { base: string; movement: Text }>
  /** Words to practise, with only letters the rules recognise */
  words: string[]
}

const byName = (signs: HandSignLang) =>
  Object.fromEntries(
    Object.values(signs.signs).map((sign) => [(sign as unknown as { name: string }).name, sign])
  ) as Record<string, GestureDescription>

const SHIFT: Text = {
  en: 'moving the hand to its own side (to your right with the right hand)',
  es: 'desplazando la mano hacia su lado (a tu derecha con la mano derecha)'
}
const SHAKE: Text = { en: 'moving the hand from side to side', es: 'moviendo la mano de lado a lado' }

/** The letters with a movement of a language, from the library (`motions`), with the movement in words */
const motionsOf = (signs: HandSignLang) =>
  Object.fromEntries(
    (signs.motions ?? []).map(({ letter, base, movement }) => [
      letter,
      { base, movement: movement.type === 'shake' ? SHAKE : SHIFT }
    ])
  )

export const SIGN_LANGUAGES: Record<SignLanguageId, SignLanguage> = {
  ASL: {
    id: 'ASL',
    name: { en: 'American Sign Language', es: 'Lengua de signos americana' },
    signs: HandSignsASL,
    images: SignImagesASL,
    alphabet: Object.keys(SignImagesASL),
    descriptions: byName(HandSignsASL),
    notRecognised: {},
    motions: motionsOf(HandSignsASL),
    words: ['HELLO', 'CAT', 'BOOK', 'FAMILY', 'WATER', 'SMILE', 'FRIEND', 'HAND']
  },
  SSL: {
    id: 'SSL',
    name: { en: 'Spanish Sign Language', es: 'Lengua de signos española' },
    signs: HandSignsSSL,
    images: SignImagesSSL,
    alphabet: Object.keys(SignImagesSSL),
    descriptions: byName(HandSignsSSL),
    notRecognised: {},
    motions: motionsOf(HandSignsSSL),
    words: ['HOLA', 'CASA', 'MANO', 'AGUA', 'GATO', 'LIBRO', 'AMIGO', 'SOL', 'NIÑO', 'CALLE', 'PERRO', 'LLAVE', 'AÑO']
  }
}

const estimators = new Map<SignLanguageId, HandSignEstimator>()

/** The rules estimator of a language, with every letter (scores from 0): the threshold is applied afterwards */
export function estimatorFor(id: SignLanguageId): HandSignEstimator {
  let estimator = estimators.get(id)
  if (estimator === undefined) {
    estimator = createHandSignEstimator(SIGN_LANGUAGES[id].signs, { minScore: 0 })
    estimators.set(id, estimator)
  }
  return estimator
}

/**
 * The letters of a word: LL and RR are one letter when the language has them (CALLE: C, A, LL, E), as with the
 * letters made with a movement
 */
export function lettersOf(word: string, language: SignLanguage): string[] {
  const letters: string[] = []
  const compact = word.replaceAll(' ', '')
  for (let i = 0; i < compact.length; i++) {
    const pair = compact.slice(i, i + 2)
    if (pair.length === 2 && pair[0] === pair[1] && language.alphabet.includes(pair)) {
      letters.push(pair)
      i++
    } else {
      letters.push(compact[i])
    }
  }
  return letters
}
