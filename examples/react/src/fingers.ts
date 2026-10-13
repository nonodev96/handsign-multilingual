import type { CurlName, DirectionName, FingerName } from 'handsign-multilingual'
import type { Text } from './settings'

export const FINGER_NAMES: Record<FingerName, Text> = {
  Thumb: { en: 'Thumb', es: 'Pulgar' },
  Index: { en: 'Index', es: 'Índice' },
  Middle: { en: 'Middle', es: 'Corazón' },
  Ring: { en: 'Ring', es: 'Anular' },
  Pinky: { en: 'Pinky', es: 'Meñique' }
}

export const CURL_NAMES: Record<CurlName, Text> = {
  NoCurl: { en: 'straight', es: 'estirado' },
  HalfCurl: { en: 'half bent', es: 'medio doblado' },
  FullCurl: { en: 'bent', es: 'doblado' }
}

const ARROWS: Record<DirectionName, string> = {
  VerticalUp: '↑',
  VerticalDown: '↓',
  HorizontalLeft: '←',
  HorizontalRight: '→',
  DiagonalUpRight: '↗',
  DiagonalUpLeft: '↖',
  DiagonalDownRight: '↘',
  DiagonalDownLeft: '↙'
}
const FLIPPED: Record<string, string> = { '←': '→', '→': '←', '↗': '↖', '↖': '↗', '↘': '↙', '↙': '↘' }

/** The direction as an arrow, as it looks on screen (`flip`: the image is the mirror of the frame of the letters) */
export const arrow = (direction: DirectionName, flip: boolean) => {
  const symbol = ARROWS[direction]
  // U+FE0E: as text (some fonts draw the diagonal arrows as emoji)
  return `${flip ? (FLIPPED[symbol] ?? symbol) : symbol}\uFE0E`
}
