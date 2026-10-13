import type { LetterScore } from './estimator'
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
  /**
   * Share of the frames with a letter recognised, from a moment before the movement until now, in which the hand makes
   * the base letter (0 to 1). The frames without a letter do not count: the hand is blurred while it moves fast
   */
  minBaseShare?: number
  /** How far the hand has to move in a shift, in sizes of the palm */
  minShift?: number
  /** How far each swing of a shake has to go, in sizes of the palm (measured at the fingertips) */
  minSwing?: number
  /** How many changes of direction make a shake */
  minReversals?: number
}

/**
 * What was recognised in a frame without movement: the letter (null: none) or the letters with their scores, best first
 * (what `estimate(hand).letters` or `classifier.predict(hand)` return). With the scores, the base letter also counts
 * when it is not first but almost
 */
export type FrameLetters = string | null | readonly LetterScore[]

/** Where the hand is in a frame */
type Sample = {
  time: number
  // The centre of the hand and of its fingertips, in pixels (x mirrored for hands labelled "Right")
  x: number
  y: number
  tipX: number
  palm: number
  // The letters it may be making (empty: none recognised)
  letters: string[]
}

const WRIST = 0
const MIDDLE_FINGER_BASE = 9
const FINGERTIPS = [4, 8, 12, 16, 20]
// How close to the first a letter has to score to count too
const CLOSE_SCORE = 0.06
// The positions are smoothed over this many milliseconds on each side: the landmarks tremble from frame to frame
const SMOOTHING_MS = 70
// The base letter is looked for from this long before the movement starts
const BEFORE_MS = 600
// A shift is decided this long after the hand stops going that way: if it comes straight back, it was a shake
const SETTLE_MS = 150
// …and it has to be recent
const RECENT_MS = 500
// After recognising a letter, the same one again within this long is the same movement going on
const REPEAT_MS = 800
// The quickest and slowest shifts, and swings of a shake
const SHIFT_MS = { min: 100, max: 1600 }
// A shift goes at least this fast in its middle, in sizes of the palm per second: slower, the hand is drifting
const MIN_SHIFT_SPEED = 0.5
// A shift that comes right after a stroke the other way, in this many milliseconds, is part of a shake
const BEFORE_SHIFT_MS = 500
// How much further than the end of a shift the hand may go after it, as a share of the shift (the landmarks tremble)
const FURTHEST_TOLERANCE = 0.12
const SWING_MS = { min: 60, max: 700 }

const average = (values: number[]) =>
  values.reduce((sum, value) => sum + value, 0) / values.length
const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

function lettersOf(recognised: FrameLetters): string[] {
  if (recognised === null) return []
  if (typeof recognised === 'string') return [recognised]
  const best = recognised[0]?.score
  return best === undefined
    ? []
    : recognised
        .filter(({ score }) => score >= best - CLOSE_SCORE)
        .map(({ letter }) => letter)
}

/**
 * Recognises the letters made with a movement (LL, Ñ, RR…) in the hand of each frame of a video. It follows the hand in
 * the image (its 2D `keypoints`) and, when it keeps the handshape of the base letter while it moves as the letter says,
 * returns that letter. One tracker per hand.
 *
 * - Shift (LL, RR): the last stroke of the hand to the side, fairly straight and long enough, whether quick or slow. It
 *   is decided a moment after the hand stops going that way (if it comes straight back, it was a shake)
 * - Shake (Ñ): the fingertips going from side to side, as when moving the hand or turning the wrist
 *
 * The handshape is checked from a moment before the movement until now, among the frames with a letter recognised
 * (while the hand moves fast it is often blurred), and the base letter has to be seen during the movement or just after
 * it: changing to another letter while moving is not a letter with movement.
 *
 * The movements are measured in sizes of the palm, so they do not depend on how close the hand is, and in the frame
 * the letters are described in (`canonicalLandmarks`), so the left hand and mirrored images work too
 */
export class HandMotionTracker {
  private samples: Sample[] = []
  private handedness: string | undefined
  // The last letter recognised and when it was seen last: while the movement goes on, it is not repeated
  private last: { letter: string; time: number } | null = null
  private readonly options: Required<MotionTrackerOptions>

  constructor(
    readonly signs: MotionSign[],
    options: MotionTrackerOptions = {}
  ) {
    this.options = {
      windowMs: 2000,
      minBaseShare: 0.5,
      minShift: 0.5,
      minSwing: 0.12,
      minReversals: 2,
      ...options
    }
  }

  /**
   * Adds a frame: the hand and what was recognised in it without movement (the letter, or the letters with their
   * scores). Returns the letter with movement recognised now, or null. After recognising one, it starts again from the
   * next frame, and the same letter is not repeated while the movement goes on (until a pause of 800 ms)
   */
  update(
    hand: DetectedHand,
    recognised: FrameLetters,
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
      tipX: average(FINGERTIPS.map((index) => points[index].x)) * mirror,
      palm: Math.hypot(
        points[MIDDLE_FINGER_BASE].x - points[WRIST].x,
        points[MIDDLE_FINGER_BASE].y - points[WRIST].y
      ),
      letters: lettersOf(recognised)
    })
    this.samples = this.samples.filter(
      (sample) => time - sample.time <= this.options.windowMs
    )

    const found = this.recognise()
    if (found === null) return null
    this.samples = []
    // The same letter again, without a pause: the same movement going on (a long shake)
    const repeated =
      this.last?.letter === found && time - this.last.time < REPEAT_MS
    this.last = { letter: found, time }
    return repeated ? null : found
  }

  /** Forgets the movement so far (when the hand goes out of sight) */
  reset() {
    this.samples = []
    this.last = null
  }

  private recognise(): string | null {
    const samples = this.samples
    if (samples.length < 4) return null
    const palm = median(samples.map(({ palm }) => palm)) || 1
    const times = samples.map(({ time }) => time)
    const smooth = (values: number[]) =>
      values.map((_, i) =>
        average(
          values.filter(
            (__, j) => Math.abs(times[j] - times[i]) <= SMOOTHING_MS
          )
        )
      )
    const track = {
      times,
      raw: samples.map(({ x }) => x / palm),
      xs: smooth(samples.map(({ x }) => x / palm)),
      ys: smooth(samples.map(({ y }) => y / palm)),
      tips: smooth(samples.map(({ tipX }) => tipX / palm))
    }
    let best: { letter: string; share: number } | null = null
    for (const { letter, base, movement } of this.signs) {
      const start =
        movement.type === 'shift'
          ? this.shiftStart(track, movement.direction)
          : this.shakeStart(track)
      if (start === null) continue
      const share = this.baseShare(base, start)
      if (share !== null && (best === null || share > best.share))
        best = { letter, share }
    }
    return best?.letter ?? null
  }

  /**
   * How much the hand makes the base letter, from a moment before the movement started until now (null: not enough).
   * The base letter has to be seen at least twice since the movement started
   */
  private baseShare(base: string, start: number): number | null {
    const recognised = this.samples.filter(
      ({ time, letters }) => time >= start - BEFORE_MS && letters.length > 0
    )
    const withBase = recognised.filter(({ letters }) => letters.includes(base))
    const since = withBase.filter(({ time }) => time >= start).length
    if (recognised.length === 0 || since < 2) return null
    const share = withBase.length / recognised.length
    return share >= this.options.minBaseShare ? share : null
  }

  /**
   * When the last shift towards `direction` started (null: none). Looks for a stroke from i to j: long enough, mostly
   * sideways, fairly straight, not too quick, too short or too slow and without a jump in a single frame (the hand lost
   * and found again). j is the furthest the hand has gone that way since, it was a moment ago and the hand has not come
   * straight back (that would be a shake)
   */
  private shiftStart(
    {
      times,
      raw,
      xs,
      ys
    }: { times: number[]; raw: number[]; xs: number[]; ys: number[] },
    direction: 'left' | 'right'
  ): number | null {
    const sign = direction === 'left' ? -1 : 1
    const last = times.length - 1
    const now = times[last]
    let found: { from: number; to: number; distance: number } | null = null
    // For each frame, how far the hand came from that way in the moment before: a stroke right after one the other way
    // is part of a shake
    const cameFrom = times.map((time, i) => {
      let most = 0
      for (let k = i - 1; k >= 0 && time - times[k] <= BEFORE_SHIFT_MS; k--)
        most = Math.max(most, sign * (xs[k] - xs[i]))
      return most
    })
    for (let j = last; j > 0; j--) {
      const since = now - times[j]
      if (since > RECENT_MS) break
      if (since < SETTLE_MS) continue
      // After j: how much further it went that way (j has to be about the furthest; the landmarks tremble) and how
      // much it came back from there
      const position = sign * xs[j]
      let reach = position
      let back = 0
      for (let k = j + 1; k <= last; k++) {
        reach = Math.max(reach, sign * xs[k])
        back = Math.max(back, reach - sign * xs[k])
      }
      let path = 0
      let jump = 0
      for (let i = j - 1; i >= 0; i--) {
        path += Math.abs(xs[i + 1] - xs[i])
        jump = Math.max(jump, Math.abs(raw[i + 1] - raw[i]))
        const duration = times[j] - times[i]
        if (duration > SHIFT_MS.max) break
        const distance = sign * (xs[j] - xs[i])
        if (duration < SHIFT_MS.min || distance < this.options.minShift)
          continue
        if (found !== null && distance <= found.distance) continue
        if (
          Math.abs(ys[j] - ys[i]) <= 0.7 * distance &&
          path <= 1.35 * distance + 0.15 &&
          jump <= 0.8 * distance &&
          reach - position <= FURTHEST_TOLERANCE * distance &&
          back <= 0.6 * distance &&
          cameFrom[i] <= 0.4 * distance &&
          this.coreSpeed(times, xs, sign, i, j, distance) >= MIN_SHIFT_SPEED
        )
          found = { from: i, to: j, distance }
      }
    }
    if (found === null) return null
    // It starts when the hand starts moving: the last moment from which 85 % of the stroke is still ahead (from i, the
    // hand may have been still for a while)
    let onset = found.from
    while (
      onset + 1 < found.to &&
      sign * (xs[found.to] - xs[onset + 1]) >= 0.85 * found.distance
    )
      onset++
    return times[onset]
  }

  /** How fast the hand goes in the middle of a stroke (from 15 % to 85 % of the way), in sizes of the palm per second */
  private coreSpeed(
    times: number[],
    xs: number[],
    sign: number,
    from: number,
    to: number,
    distance: number
  ) {
    const reached = (share: number) => {
      for (let k = from; k <= to; k++)
        if (sign * (xs[k] - xs[from]) >= share * distance) return times[k]
      return times[to]
    }
    const duration = (reached(0.85) - reached(0.15)) / 1000
    return duration <= 0
      ? Number.POSITIVE_INFINITY
      : (0.7 * distance) / duration
  }

  /**
   * When the last shake started (null: none): the fingertips change direction `minReversals` times, each swing at
   * least `minSwing` and, between two changes of direction, neither too quick (trembling) nor too slow (moving the
   * hand somewhere else)
   */
  private shakeStart({
    times,
    tips
  }: { times: number[]; tips: number[] }): number | null {
    const swing = this.options.minSwing
    let reversals = 0
    let direction = 0
    // Before the first swing, the lowest and highest point so far: the first swing starts at one of them
    let low = 0
    let high = 0
    let extreme = 0
    let start = times[0]
    let turnedAt = times[0]
    for (let i = 1; i < tips.length; i++) {
      if (direction === 0) {
        if (tips[i] < tips[low]) low = i
        if (tips[i] > tips[high]) high = i
        const from =
          tips[i] - tips[low] >= swing
            ? low
            : tips[high] - tips[i] >= swing
              ? high
              : null
        if (from !== null) {
          direction = from === low ? 1 : -1
          start = times[from]
          extreme = i
        }
      } else if ((tips[i] - tips[extreme]) * direction > 0) {
        extreme = i
      } else if (Math.abs(tips[i] - tips[extreme]) >= swing) {
        const swingMs = times[extreme] - turnedAt
        if (
          reversals > 0 &&
          (swingMs < SWING_MS.min || swingMs > SWING_MS.max)
        ) {
          // Not a swing of a shake: it starts again from this change of direction
          reversals = 1
          start = turnedAt
        } else {
          reversals++
        }
        turnedAt = times[extreme]
        direction = -direction
        extreme = i
      }
    }
    return reversals >= this.options.minReversals ? start : null
  }
}
