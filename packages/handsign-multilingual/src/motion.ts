import type { DetectedHand } from './hand'

/**
 * How a letter moves, horizontally, in the frame the letters are described in (a right hand in a non-mirrored image):
 * - shift: the hand moves to one side, `left` or `right` of the image
 * - shake: the hand goes from side to side
 */
export type Movement =
  | { type: 'shift'; direction: 'left' | 'right' }
  | { type: 'shake' }

/** A letter made with the handshape of another one (`base`) and a movement: LL is an L moving to the side */
export type MotionSign = { letter: string; base: string; movement: Movement }

export type MotionTrackerOptions = {
  /** How far back the movement is looked for, in milliseconds */
  windowMs?: number
  /** Share of the frames of the window in which the hand has to make the base letter (0 to 1) */
  minBaseShare?: number
  /** How far the hand has to move in a shift, in sizes of the palm */
  minShift?: number
  /** How far each swing of a shake has to go, in sizes of the palm */
  minSwing?: number
  /** How many changes of direction make a shake */
  minReversals?: number
}

/** Where the hand is in a frame */
type Sample = {
  time: number
  x: number
  y: number
  palm: number
  letter: string | null
}

const WRIST = 0
const MIDDLE_FINGER_BASE = 9

const average = (values: number[]) =>
  values.reduce((sum, value) => sum + value, 0) / values.length
const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

/**
 * Recognises the letters made with a movement (LL, Ñ, RR…) in the hand of each frame of a video. It follows the centre
 * of the hand in the image (its 2D `keypoints`) and, when the hand keeps the handshape of the base letter while it
 * moves as the letter says, returns that letter. One tracker per hand.
 *
 * The movements are measured in sizes of the palm, so they do not depend on how close the hand is, and in the frame
 * the letters are described in (`canonicalLandmarks`), so the left hand and mirrored images work too
 */
export class HandMotionTracker {
  private samples: Sample[] = []
  private handedness: string | undefined
  private readonly options: Required<MotionTrackerOptions>

  constructor(
    readonly signs: MotionSign[],
    options: MotionTrackerOptions = {}
  ) {
    this.options = {
      windowMs: 1500,
      minBaseShare: 0.5,
      minShift: 0.8,
      minSwing: 0.25,
      minReversals: 2,
      ...options
    }
  }

  /**
   * Adds a frame: the hand and the letter recognised in it without movement (null: none). Returns the letter with
   * movement recognised now, or null. After recognising one, it starts again from the next frame
   */
  update(
    hand: DetectedHand,
    letter: string | null,
    time: number = Date.now()
  ): string | null {
    const points = hand.keypoints
    if (!points || points.length < 21) return null
    // Another label is another frame (mirrored): mixing them would look like a jump to the other side
    if (hand.handedness !== this.handedness) {
      this.samples = []
      this.handedness = hand.handedness
    }
    const mirror = hand.handedness === 'Right' ? -1 : 1
    this.samples.push({
      time,
      x: average(points.map(({ x }) => x)) * mirror,
      y: average(points.map(({ y }) => y)),
      palm: Math.hypot(
        points[MIDDLE_FINGER_BASE].x - points[WRIST].x,
        points[MIDDLE_FINGER_BASE].y - points[WRIST].y
      ),
      letter
    })
    this.samples = this.samples.filter(
      (sample) => time - sample.time <= this.options.windowMs
    )

    const recognised = this.recognise()
    if (recognised !== null) this.samples = []
    return recognised
  }

  /** Forgets the movement so far (when the hand goes out of sight) */
  reset() {
    this.samples = []
  }

  private recognise(): string | null {
    const samples = this.samples
    if (
      samples.length < 4 ||
      samples[samples.length - 1].time - samples[0].time < 200
    )
      return null
    const palm = median(samples.map(({ palm }) => palm)) || 1
    const xs = samples.map(({ x }) => x / palm)
    const ys = samples.map(({ y }) => y / palm)
    let best: { letter: string; share: number } | null = null
    for (const { letter, base, movement } of this.signs) {
      const share =
        samples.filter((sample) => sample.letter === base).length /
        samples.length
      if (
        share < this.options.minBaseShare ||
        (best !== null && share <= best.share)
      )
        continue
      const moved =
        movement.type === 'shift'
          ? this.isShift(xs, ys, movement.direction)
          : this.isShake(xs)
      if (moved) best = { letter, share }
    }
    return best?.letter ?? null
  }

  // Mostly sideways, mostly one way, far enough and over several frames (a jump in one frame is the hand being lost
  // and found again, not a movement). The ends are the mean of two frames (the points tremble)
  private isShift(xs: number[], ys: number[], direction: 'left' | 'right') {
    const ends = (values: number[]) => [
      average(values.slice(0, 2)),
      average(values.slice(-2))
    ]
    const [x0, x1] = ends(xs)
    const [y0, y1] = ends(ys)
    const dx = x1 - x0
    const dy = y1 - y0
    let path = 0
    let longestStep = 0
    for (let i = 1; i < xs.length; i++) {
      const step = Math.abs(xs[i] - xs[i - 1])
      path += step
      longestStep = Math.max(longestStep, step)
    }
    const towards = direction === 'left' ? -dx : dx
    return (
      towards >= this.options.minShift &&
      Math.abs(dy) <= 0.6 * Math.abs(dx) &&
      path <= 1.8 * Math.abs(dx) &&
      longestStep <= 0.75 * Math.abs(dx)
    )
  }

  // Changes of direction, each one after going at least a swing from the last turn (smaller trembles do not count)
  private isShake(xs: number[]) {
    const swing = this.options.minSwing
    let reversals = 0
    let direction = 0
    let extreme = xs[0]
    for (const x of xs.slice(1)) {
      if (direction === 0) {
        if (Math.abs(x - extreme) >= swing) {
          direction = Math.sign(x - extreme)
          extreme = x
        }
      } else if ((x - extreme) * direction > 0) {
        extreme = x
      } else if (Math.abs(x - extreme) >= swing) {
        reversals++
        direction = -direction
        extreme = x
      }
    }
    return reversals >= this.options.minReversals
  }
}
