import { describe, expect, test } from 'vitest'
import { HandMotionTracker, HandSignsSSL } from '../src'
import { PIXELS, type SyntheticHand, detectedHand } from './syntheticHand'

const folded = { curl: 'folded', angle: 90 } as const
const straight = (angle: number) => ({ curl: 'straight', angle }) as const
// Only the position of the hand matters here: the letter of each frame is given
const HAND: SyntheticHand = {
  thumb: straight(45),
  index: straight(90),
  middle: folded,
  ring: folded,
  pinky: folded
}
const PALM = 1.05 * PIXELS
const FRAME_MS = 50

type Options = { letter?: string | null; mirrored?: boolean; frameMs?: number }

/**
 * Plays a movement: the position of the wrist in each frame, in sizes of the palm (x to the right of the image, y
 * down), from (320, 360) px. Returns what the tracker recognised in each frame
 */
function play(
  tracker: HandMotionTracker,
  path: Array<[number, number]>,
  { letter = 'L', mirrored = false, frameMs = FRAME_MS }: Options = {}
) {
  return path.map(([x, y], frame) =>
    tracker.update(
      detectedHand(HAND, {
        mirrored,
        at: { x: 320 + x * PALM, y: 360 + y * PALM }
      }),
      letter,
      frame * frameMs
    )
  )
}

const still = (frames: number): Array<[number, number]> =>
  Array.from({ length: frames }, () => [0, 0])
/** From 0 to `to` (palm sizes, sideways) in `frames` frames */
const slide = (to: number, frames: number, dy = 0): Array<[number, number]> =>
  Array.from({ length: frames }, (_, i) => [
    (to * (i + 1)) / frames,
    (dy * (i + 1)) / frames
  ])
/** Side to side: `swings` half waves of `amplitude` palm sizes, `frames` frames each */
const shake = (
  amplitude: number,
  swings: number,
  frames = 4
): Array<[number, number]> =>
  Array.from({ length: swings * frames }, (_, i) => [
    amplitude * Math.sin((Math.PI * (i + 1)) / frames),
    0
  ])

const tracker = () => new HandMotionTracker(HandSignsSSL.motions ?? [])
const recognised = (results: Array<string | null>) =>
  results.filter((result) => result !== null)

describe('HandMotionTracker', () => {
  test('the Spanish alphabet has LL, Ñ and RR as motions of L, N and R', () => {
    expect(
      HandSignsSSL.motions?.map(({ letter, base }) => `${letter}:${base}`)
    ).toEqual(['LL:L', 'Ñ:N', 'RR:R'])
  })

  test('LL: the L moving to the side of the hand (left of the image for a right hand)', () => {
    expect(
      recognised(play(tracker(), [...still(6), ...slide(-1.2, 8)]))
    ).toEqual(['LL'])
  })

  test('RR: the R moving the same way', () => {
    expect(
      recognised(
        play(tracker(), [...still(4), ...slide(-1.2, 8)], { letter: 'R' })
      )
    ).toEqual(['RR'])
  })

  test('Ñ: the N going from side to side', () => {
    expect(
      recognised(
        play(tracker(), [...still(4), ...shake(0.4, 4)], { letter: 'N' })
      )
    ).toEqual(['Ñ'])
  })

  test('the left hand, or a mirrored image, moving the other way in the image is also LL', () => {
    expect(
      recognised(
        play(tracker(), [...still(6), ...slide(1.2, 8)], { mirrored: true })
      )
    ).toEqual(['LL'])
  })

  test('the L still, or moving to the other side, is not LL', () => {
    expect(recognised(play(tracker(), still(30)))).toEqual([])
    expect(
      recognised(play(tracker(), [...still(6), ...slide(1.2, 8)]))
    ).toEqual([])
  })

  test('a short movement, a mostly vertical one or a slow one is not a shift', () => {
    expect(recognised(play(tracker(), slide(-0.4, 8)))).toEqual([])
    expect(recognised(play(tracker(), slide(-0.9, 8, 1.5)))).toEqual([])
    // A palm and a half in four seconds: more than the window of 1.5 s
    expect(recognised(play(tracker(), slide(-1.5, 80)))).toEqual([])
  })

  test('the hand has to keep the handshape of the base letter while it moves', () => {
    expect(
      recognised(
        play(tracker(), [...still(6), ...slide(-1.2, 8)], { letter: 'A' })
      )
    ).toEqual([])
    expect(
      recognised(
        play(tracker(), [...still(6), ...slide(-1.2, 8)], { letter: null })
      )
    ).toEqual([])
  })

  test('a shift is not a shake, and small trembles are not a shake', () => {
    expect(
      recognised(play(tracker(), slide(-1.2, 8), { letter: 'N' }))
    ).toEqual([])
    expect(recognised(play(tracker(), shake(0.1, 6), { letter: 'N' }))).toEqual(
      []
    )
  })

  test('a shake with the L is not LL', () => {
    expect(recognised(play(tracker(), shake(0.4, 4)))).toEqual([])
  })

  test('after recognising a letter it starts again: the end of the same movement does not repeat it', () => {
    const results = play(tracker(), [
      ...still(4),
      ...slide(-1.2, 8),
      ...slide(-0.3, 4).map(([x]) => [x - 1.2, 0] as [number, number])
    ])
    expect(recognised(results)).toEqual(['LL'])
  })

  test('a jump in a single frame (the hand lost and found again) is not a shift', () => {
    const jump: Array<[number, number]> = [
      ...still(6),
      ...still(6).map(() => [-1.5, 0] as [number, number])
    ]
    expect(recognised(play(tracker(), jump))).toEqual([])
  })

  test('when the label of the hand changes, it starts again: the other frame is mirrored', () => {
    const motion = tracker()
    // The same hand, still, labelled "Left" and then "Right" (a mirrored image would put it on the other side)
    const left = still(6).map((_, frame) =>
      motion.update(
        detectedHand(HAND, { at: { x: 500, y: 360 } }),
        'L',
        frame * FRAME_MS
      )
    )
    const right = still(6).map((_, frame) =>
      motion.update(
        detectedHand(HAND, { mirrored: true, at: { x: 500, y: 360 } }),
        'L',
        (frame + 6) * FRAME_MS
      )
    )
    expect(recognised([...left, ...right])).toEqual([])
  })

  test('without the 2D points of the hand it does nothing', () => {
    expect(tracker().update({ keypoints3D: [] }, 'L', 0)).toBeNull()
  })
})
