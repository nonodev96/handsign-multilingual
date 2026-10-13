import type { DetectedHand, LetterScore } from '../src'
import { type SyntheticHand, syntheticLandmarks } from './syntheticHand'

/*
 * Hands moving as in front of a webcam, to measure HandMotionTracker without recordings: the landmarks tremble, the
 * frame rate changes and frames are lost, MediaPipe jumps now and then, the movements speed up and slow down
 * (minimum jerk), drift up or down and sometimes come back, and the letter recognised in each frame is noisy (often
 * none or another one while the hand moves fast, as with motion blur). Everything comes from a seed, so it is always the
 * same
 */

/** A pseudo-random generator from a seed (mulberry32): numbers from 0 to 1 */
export function seeded(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
type Random = () => number
const between = (random: Random, min: number, max: number) =>
  min + (max - min) * random()
const gaussian = (random: Random) =>
  Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(2 * Math.PI * random())
/** Minimum jerk: how far along a movement is at a moment, from 0 to 1, as people move */
const minimumJerk = (t: number) => {
  const s = Math.min(1, Math.max(0, t))
  return 10 * s ** 3 - 15 * s ** 4 + 6 * s ** 5
}

/**
 * Where the hand is at a moment, in the frame the letters are described in (a right hand in a non-mirrored image): x to
 * the right and y down, in sizes of the palm from where it starts; `angle`, how much it is turned around the wrist (in
 * the image, degrees); `shape`, the letter it makes (null: changing from one letter to another)
 */
export type Pose = { x: number; y: number; angle: number; shape: string | null }
/** A gesture: its duration (ms) and where the hand is at each moment */
export type Gesture = { duration: number; at: (time: number) => Pose }

export type Scenario = {
  name: string
  /** The letter with movement it has to recognise; null: none */
  expected: string | null
  gesture: (random: Random) => Gesture
}

// The handshapes: only the position of the hand matters to the tracker, the letter of each frame is simulated
const folded = { curl: 'folded', angle: 90 } as const
const SHAPE: SyntheticHand = {
  thumb: { curl: 'straight', angle: 45 },
  index: { curl: 'straight', angle: 90 },
  middle: folded,
  ring: folded,
  pinky: folded
}
const LANDMARKS = syntheticLandmarks(SHAPE)
// The palm of the synthetic hand (wrist to the base of the middle finger), in its units
const PALM = Math.hypot(LANDMARKS[9][0], LANDMARKS[9][1])
// The letter the recogniser may take each base letter for
const LOOKALIKE: Record<string, string> = { L: 'D', N: 'M', R: 'U' }

/** Holds still (with the slow sway of a hand in the air) */
const hold = (shape: string | null, duration: number): Gesture => ({
  duration,
  at: () => ({ x: 0, y: 0, angle: 0, shape })
})

/** Goes from (0, 0) to (dx, dy) palms, with minimum jerk */
const move = (
  shape: string | null,
  duration: number,
  dx: number,
  dy = 0
): Gesture => ({
  duration,
  at: (time) => {
    const s = minimumJerk(time / duration)
    return { x: dx * s, y: dy * s, angle: 0, shape }
  }
})

/** Side to side: `cycles` waves of `amplitude` palms, `frequency` waves per second (and turning `degrees` if given) */
const shake = (
  shape: string,
  cycles: number,
  frequency: number,
  amplitude: number,
  degrees = 0
): Gesture => {
  const duration = (1000 * cycles) / frequency
  return {
    duration,
    at: (time) => {
      const phase = Math.sin((2 * Math.PI * frequency * time) / 1000)
      // Starts and ends smoothly
      const envelope = Math.min(1, time / 120, (duration - time) / 120)
      return {
        x: amplitude * phase * envelope,
        y: 0,
        angle: degrees * phase * envelope,
        shape
      }
    }
  }
}

/** One gesture after another: each one starts where the previous one ended */
function sequence(...gestures: Gesture[]): Gesture {
  const ends: Pose[] = []
  let origin = { x: 0, y: 0 }
  for (const gesture of gestures) {
    const end = gesture.at(gesture.duration)
    origin = { x: origin.x + end.x, y: origin.y + end.y }
    ends.push({ ...end, x: origin.x, y: origin.y })
  }
  return {
    duration: gestures.reduce((sum, { duration }) => sum + duration, 0),
    at: (time) => {
      let start = 0
      let base = { x: 0, y: 0 }
      for (const [index, gesture] of gestures.entries()) {
        if (time <= start + gesture.duration || index === gestures.length - 1) {
          const pose = gesture.at(Math.min(time - start, gesture.duration))
          return { ...pose, x: base.x + pose.x, y: base.y + pose.y }
        }
        start += gesture.duration
        base = { x: ends[index].x, y: ends[index].y }
      }
      return gestures[0].at(0)
    }
  }
}

/** The hand that signs moves to its side: left of the image in the frame the letters are described in */
const OUTWARDS = -1

export const SCENARIOS: Scenario[] = [
  // LL and RR: the base letter, then to the side of the hand and, sometimes, back
  ...(['LL', 'RR'] as const).map(
    (letter): Scenario => ({
      name: `${letter}: hold the ${letter[0]}, move to the side`,
      expected: letter,
      gesture: (random) =>
        sequence(
          hold(letter[0], between(random, 300, 900)),
          move(
            letter[0],
            between(random, 250, 700),
            OUTWARDS * between(random, 0.55, 1.3),
            between(random, -0.3, 0.3)
          ),
          hold(letter[0], between(random, 200, 500))
        )
    })
  ),
  {
    name: 'LL: slow (a second or more)',
    expected: 'LL',
    gesture: (random) =>
      sequence(
        hold('L', between(random, 300, 600)),
        move(
          'L',
          between(random, 900, 1500),
          OUTWARDS * between(random, 0.7, 1.2),
          between(random, -0.2, 0.2)
        ),
        hold('L', 300)
      )
  },
  {
    name: 'LL: short and quick',
    expected: 'LL',
    gesture: (random) =>
      sequence(
        hold('L', between(random, 400, 800)),
        move(
          'L',
          between(random, 150, 300),
          OUTWARDS * between(random, 0.5, 0.75)
        ),
        hold('L', 300)
      )
  },
  {
    name: 'LL: and back to where it started',
    expected: 'LL',
    gesture: (random) => {
      const distance = OUTWARDS * between(random, 0.6, 1.2)
      return sequence(
        hold('L', between(random, 300, 700)),
        move('L', between(random, 250, 600), distance),
        move('L', between(random, 300, 600), -distance),
        hold('L', 300)
      )
    }
  },
  // Ñ: the N from side to side, moving the hand or turning the wrist
  {
    name: 'Ñ: the hand from side to side',
    expected: 'Ñ',
    gesture: (random) =>
      sequence(
        hold('N', between(random, 300, 700)),
        shake(
          'N',
          between(random, 1.5, 3),
          between(random, 1.8, 4),
          between(random, 0.15, 0.35)
        ),
        hold('N', 300)
      )
  },
  {
    name: 'Ñ: turning the wrist from side to side',
    expected: 'Ñ',
    gesture: (random) =>
      sequence(
        hold('N', between(random, 300, 700)),
        shake(
          'N',
          between(random, 1.5, 3),
          between(random, 1.8, 4),
          between(random, 0, 0.08),
          between(random, 12, 25)
        ),
        hold('N', 300)
      )
  },
  // What is not a letter with movement
  {
    name: 'the L still, swaying a little',
    expected: null,
    gesture: (random) => {
      const sway = between(random, 0.1, 0.25)
      return {
        duration: 3000,
        at: (time) => ({
          x: sway * Math.sin(time / 700),
          y: 0.5 * sway * Math.sin(time / 900),
          angle: 3 * Math.sin(time / 800),
          shape: 'L'
        })
      }
    }
  },
  {
    name: 'the L moving to the other side',
    expected: null,
    gesture: (random) =>
      sequence(
        hold('L', 500),
        move(
          'L',
          between(random, 250, 600),
          -OUTWARDS * between(random, 0.6, 1.3)
        ),
        hold('L', 400)
      )
  },
  {
    name: 'the L moving up or down',
    expected: null,
    gesture: (random) =>
      sequence(
        hold('L', 500),
        move(
          'L',
          between(random, 250, 600),
          between(random, -0.3, 0.3),
          (random() < 0.5 ? -1 : 1) * between(random, 0.7, 1.3)
        ),
        hold('L', 400)
      )
  },
  {
    name: 'the N still, trembling',
    expected: null,
    gesture: () => hold('N', 3000)
  },
  {
    name: 'the N moving once to the side (not a shake)',
    expected: null,
    gesture: (random) =>
      sequence(
        hold('N', 500),
        move(
          'N',
          between(random, 250, 600),
          OUTWARDS * between(random, 0.6, 1.2)
        ),
        hold('N', 400)
      )
  },
  {
    name: 'spelling a word, the hand drifting to the side between letters',
    expected: null,
    gesture: (random) => {
      const letters = ['A', 'L', 'O', 'N', 'R', 'E', 'L', 'A']
      const step = OUTWARDS * between(random, 0.15, 0.35)
      return sequence(
        ...letters.flatMap((letter) => [
          hold(letter, between(random, 300, 500)),
          move(
            null,
            between(random, 120, 250),
            step,
            between(random, -0.1, 0.1)
          )
        ])
      )
    }
  },
  {
    name: 'changing from the L to another letter while moving to the side',
    expected: null,
    gesture: (random) =>
      sequence(
        hold('L', 600),
        move(
          null,
          between(random, 250, 500),
          OUTWARDS * between(random, 0.6, 1.1)
        ),
        hold('A', 600)
      )
  }
]

export type Conditions = {
  /** Frames per second */
  fps: number
  /** Size of the palm in the image, in pixels */
  palm: number
  /** How much each landmark trembles, in sizes of the palm */
  jitter: number
  /** The left hand, or a mirrored image: MediaPipe labels it "Right" and it moves the other way in the image */
  mirrored: boolean
}

/** The conditions of a take: a webcam somewhere between a slow one and a good one */
export function conditionsOf(random: Random): Conditions {
  return {
    fps: between(random, 15, 30),
    palm: between(random, 60, 160),
    jitter: between(random, 0.015, 0.035),
    mirrored: random() < 0.5
  }
}

export type Frame = {
  time: number
  hand: DetectedHand
  /** The letter recognised in the frame without movement (null: none) */
  letter: string | null
  /** The letters that the recogniser would give, best first (the base letter, sometimes second) */
  letters: LetterScore[]
}

/** The frames of a take of the gesture: the hand as hand-pose-detection would give it and the letter recognised */
export function film(
  gesture: Gesture,
  conditions: Conditions,
  random: Random
): Frame[] {
  const frames: Frame[] = []
  const pixels = conditions.palm / PALM
  const step = 1000 / conditions.fps
  let previous: Pose | null = null
  for (let time = 0; time <= gesture.duration; time += step) {
    // Frames that do not arrive (the detector took longer)
    if (random() < 0.05) continue
    const pose = gesture.at(time)
    const speed =
      previous === null
        ? 0
        : (Math.hypot(pose.x - previous.x, pose.y - previous.y) * 1000) / step
    previous = pose
    // Now and then, MediaPipe puts the whole hand a bit off for a frame
    const glitch =
      random() < 0.03
        ? { x: gaussian(random) * 0.15, y: gaussian(random) * 0.15 }
        : { x: 0, y: 0 }
    const radians = (pose.angle * Math.PI) / 180
    const [cos, sin] = [Math.cos(radians), Math.sin(radians)]
    const keypoints = LANDMARKS.map(([lx, ly]) => {
      // Turned around the wrist, then in its place, with the tremble of each landmark
      const rx = lx * cos - ly * sin
      const ry = lx * sin + ly * cos
      const x =
        (pose.x + glitch.x) * PALM +
        rx +
        gaussian(random) * conditions.jitter * PALM
      const y =
        (pose.y + glitch.y) * PALM +
        ry +
        gaussian(random) * conditions.jitter * PALM
      // In the image: mirrored if it is the other hand or the image is mirrored
      return {
        x: 320 + (conditions.mirrored ? -x : x) * pixels,
        y: 300 + y * pixels
      }
    })
    const { letter, letters } = recognise(pose.shape, speed, random)
    frames.push({
      time,
      hand: { keypoints, handedness: conditions.mirrored ? 'Right' : 'Left' },
      letter,
      letters
    })
  }
  return frames
}

/**
 * What a recogniser sees in a frame: right most of the time with the hand still and much less when it moves fast
 * (blurred), when it often sees no letter or a lookalike. Sometimes the right letter comes second, close to the first
 */
function recognise(
  shape: string | null,
  speed: number,
  random: Random
): { letter: string | null; letters: LetterScore[] } {
  if (shape === null) return { letter: null, letters: [] }
  const right = 0.9 - 0.45 * Math.min(1, speed / 3)
  const draw = random()
  const lookalike = LOOKALIKE[shape] ?? 'B'
  if (draw < right) {
    // The right letter, sometimes with a lookalike just ahead
    if (random() < 0.15) {
      return {
        letter: lookalike,
        letters: [
          { letter: lookalike, score: 0.9 },
          { letter: shape, score: 0.86 }
        ]
      }
    }
    return { letter: shape, letters: [{ letter: shape, score: 0.92 }] }
  }
  if (draw < right + 0.1)
    return { letter: lookalike, letters: [{ letter: lookalike, score: 0.85 }] }
  return { letter: null, letters: [] }
}

export type MotionResult = {
  name: string
  expected: string | null
  /** Share of the takes that went right: the expected letter recognised once (and nothing else) or, if none, nothing */
  rate: number
}

/**
 * Plays every scenario `takes` times, each one in other conditions, and says how many went right. `track` gets the
 * frames of a take and returns what was recognised in each one
 */
export function evaluateMotion(
  track: (frames: Frame[]) => Array<string | null>,
  { takes = 60, seed = 1 }: { takes?: number; seed?: number } = {}
): MotionResult[] {
  return SCENARIOS.map((scenario, index) => {
    let right = 0
    for (let take = 0; take < takes; take++) {
      const random = seeded(seed * 100_000 + index * 1000 + take)
      const gesture = scenario.gesture(random)
      const frames = film(gesture, conditionsOf(random), random)
      const found = track(frames).filter((letter) => letter !== null)
      const ok =
        scenario.expected === null
          ? found.length === 0
          : found.length === 1 && found[0] === scenario.expected
      if (ok) right++
    }
    return {
      name: scenario.name,
      expected: scenario.expected,
      rate: right / takes
    }
  })
}
