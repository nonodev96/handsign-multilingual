import type { GestureDescription } from './fingerpose'
import type { MotionSign } from './motion'

/**
 * A fingerspelling alphabet: the description of each letter (how each finger is curled and where it points) and, for the letters made with a movement, the
 * handshape they use and how they move (HandMotionTracker recognises them)
 */
export type HandSignLang = {
  signs: {
    [name: string]: GestureDescription
  }
  motions?: MotionSign[]
}

/** The images of a letter (from `handsign-multilingual/images`): the letter drawn and the hand making it, as URLs */
export type SignImage = {
  letter: string
  sign: string
  hand: string
}
