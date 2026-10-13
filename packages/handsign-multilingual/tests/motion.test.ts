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

type Options = {
  letter?: string | null
  mirrored?: boolean
  frameMs?: number
  /** The letter of each frame, if it changes (it takes precedence over `letter`) */
  letters?: Array<string | null>
}

/**
 * Plays a movement: the position of the wrist in each frame, in sizes of the palm (x to the right of the image, y
 * down), from (320, 360) px. Returns what the tracker recognised in each frame
 */
function play(
  tracker: HandMotionTracker,
  path: Array<[number, number]>,
  { letter = 'L', mirrored = false, frameMs = FRAME_MS, letters }: Options = {}
) {
  return path.map(([x, y], frame) =>
    tracker.update(
      detectedHand(HAND, {
        mirrored,
        at: { x: 320 + x * PALM, y: 360 + y * PALM }
      }),
      letters === undefined ? letter : letters[frame] ?? null,
      frame * frameMs
    )
  )
}

const still = (frames: number): Array<[number, number]> =>
  Array.from({ length: frames }, () => [0, 0])
/** The path and then, for `frames` frames, still where it ended (a shift is decided once the hand stops) */
const thenStill = (
  path: Array<[number, number]>,
  frames = 5
): Array<[number, number]> => [
  ...path,
  ...Array.from({ length: frames }, () => path[path.length - 1])
]
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
      recognised(play(tracker(), thenStill([...still(6), ...slide(-1.2, 8)])))
    ).toEqual(['LL'])
  })

  test('LL is decided once the hand stops going that way, not while it moves', () => {
    const results = play(tracker(), thenStill([...still(6), ...slide(-1.2, 8)]))
    expect(results.slice(0, 14)).toEqual(Array(14).fill(null))
    expect(recognised(results)).toEqual(['LL'])
  })

  test('RR: the R moving the same way', () => {
    expect(
      recognised(
        play(tracker(), thenStill([...still(4), ...slide(-1.2, 8)]), {
          letter: 'R'
        })
      )
    ).toEqual(['RR'])
  })

  test('LL quick and short (half a palm in 150 ms), or slow (a palm in more than a second)', () => {
    expect(
      recognised(play(tracker(), thenStill([...still(8), ...slide(-0.6, 3)])))
    ).toEqual(['LL'])
    expect(
      recognised(play(tracker(), thenStill([...still(6), ...slide(-1, 25)])))
    ).toEqual(['LL'])
  })

  test('LL and back to where the hand started', () => {
    const out = slide(-1, 8)
    const back = slide(1, 10).map(([x]) => [x - 1, 0] as [number, number])
    expect(
      recognised(play(tracker(), thenStill([...still(6), ...out, ...back])))
    ).toEqual(['LL'])
  })

  test('Ñ: the N going from side to side', () => {
    expect(
      recognised(
        play(tracker(), [...still(4), ...shake(0.4, 4)], { letter: 'N' })
      )
    ).toEqual(['Ñ'])
  })

  test('Ñ: also a small shake (a sixth of a palm each way)', () => {
    expect(
      recognised(
        play(tracker(), [...still(4), ...shake(0.15, 6)], { letter: 'N' })
      )
    ).toEqual(['Ñ'])
  })

  test('the left hand, or a mirrored image, moving the other way in the image is also LL', () => {
    expect(
      recognised(
        play(tracker(), thenStill([...still(6), ...slide(1.2, 8)]), {
          mirrored: true
        })
      )
    ).toEqual(['LL'])
  })

  test('the L still, or moving to the other side, is not LL', () => {
    expect(recognised(play(tracker(), still(30)))).toEqual([])
    expect(
      recognised(play(tracker(), thenStill([...still(6), ...slide(1.2, 8)])))
    ).toEqual([])
  })

  test('a short movement, a mostly vertical one or a slow one is not a shift', () => {
    expect(recognised(play(tracker(), thenStill(slide(-0.4, 8))))).toEqual([])
    expect(recognised(play(tracker(), thenStill(slide(-0.9, 8, 1.5))))).toEqual(
      []
    )
    // A palm and a half in four seconds: the hand drifting, not a shift
    expect(recognised(play(tracker(), thenStill(slide(-1.5, 80))))).toEqual([])
  })

  test('the hand has to keep the handshape of the base letter while it moves', () => {
    expect(
      recognised(
        play(tracker(), thenStill([...still(6), ...slide(-1.2, 8)]), {
          letter: 'A'
        })
      )
    ).toEqual([])
    expect(
      recognised(
        play(tracker(), thenStill([...still(6), ...slide(-1.2, 8)]), {
          letter: null
        })
      )
    ).toEqual([])
  })

  test('the frames without a letter while the hand moves (blurred) do not count against the base letter', () => {
    // L still, nothing recognised while it moves, L again when it stops
    const letters = [
      ...Array(6).fill('L'),
      ...Array(8).fill(null),
      ...Array(5).fill('L')
    ]
    expect(
      recognised(
        play(tracker(), thenStill([...still(6), ...slide(-1.2, 8)]), {
          letters
        })
      )
    ).toEqual(['LL'])
  })

  test('changing from the L to another letter while moving to the side is not LL', () => {
    const letters = [
      ...Array(6).fill('L'),
      ...Array(8).fill(null),
      ...Array(5).fill('A')
    ]
    expect(
      recognised(
        play(tracker(), thenStill([...still(6), ...slide(-1.2, 8)]), {
          letters
        })
      )
    ).toEqual([])
  })

  test('with the scores of each frame, the base letter counts when it comes second but close', () => {
    const motion = tracker()
    const path = thenStill([...still(6), ...slide(-1.2, 8)])
    const results = path.map(([x, y], frame) =>
      motion.update(
        detectedHand(HAND, { at: { x: 320 + x * PALM, y: 360 + y * PALM } }),
        [
          { letter: 'D', score: 0.9 },
          { letter: 'L', score: 0.87 }
        ],
        frame * FRAME_MS
      )
    )
    expect(recognised(results)).toEqual(['LL'])
  })

  test('a shift is not a shake, and small trembles are not a shake', () => {
    expect(
      recognised(play(tracker(), thenStill(slide(-1.2, 8)), { letter: 'N' }))
    ).toEqual([])
    // A tremble of 4 % of the palm (half a centimetre)
    expect(
      recognised(play(tracker(), shake(0.04, 12), { letter: 'N' }))
    ).toEqual([])
  })

  test('a shake with the L is not LL, not even its last swing', () => {
    expect(recognised(play(tracker(), thenStill(shake(0.4, 4))))).toEqual([])
  })

  test('after recognising a letter it starts again: the end of the same movement does not repeat it', () => {
    const results = play(
      tracker(),
      thenStill([
        ...still(4),
        ...slide(-1.2, 8),
        ...still(4).map(() => [-1.2, 0] as [number, number]),
        ...slide(-0.3, 4).map(([x]) => [x - 1.2, 0] as [number, number])
      ])
    )
    expect(recognised(results)).toEqual(['LL'])
  })

  test('a jump in a single frame (the hand lost and found again) is not a shift', () => {
    const jump: Array<[number, number]> = [
      ...still(6),
      ...still(6).map(() => [-1.5, 0] as [number, number])
    ]
    expect(recognised(play(tracker(), jump))).toEqual([])
  })

  test('a long shake is one Ñ; another one needs a pause', () => {
    const long = [...still(4), ...shake(0.3, 12)]
    expect(recognised(play(tracker(), long, { letter: 'N' }))).toEqual(['Ñ'])
    const twice = [...long, ...still(20), ...shake(0.3, 6)]
    expect(recognised(play(tracker(), twice, { letter: 'N' }))).toEqual([
      'Ñ',
      'Ñ'
    ])
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
