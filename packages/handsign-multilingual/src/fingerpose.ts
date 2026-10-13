// The finger pose estimation of fingerpose 0.1.0 (https://github.com/andypotato/fingerpose, MIT License, Copyright (c)
// 2020 Andreas Schallwig), ported to TypeScript: how bent each finger is (curl) and where it points (direction), from
// the 21 hand landmarks, and how well that matches each letter. It computes exactly what fingerpose does, quirks
// included, so the letters score the same

export type FingerName = 'Thumb' | 'Index' | 'Middle' | 'Ring' | 'Pinky'
export type CurlName = 'NoCurl' | 'HalfCurl' | 'FullCurl'
export type DirectionName =
  | 'VerticalUp'
  | 'VerticalDown'
  | 'HorizontalLeft'
  | 'HorizontalRight'
  | 'DiagonalUpRight'
  | 'DiagonalUpLeft'
  | 'DiagonalDownRight'
  | 'DiagonalDownLeft'

/** The curl and direction of a finger, as detected or as a letter expects them (with its weight) */
export type FingerPose = {
  finger: FingerName
  curl: CurlName
  direction: DirectionName
}

/** A landmark as [x, y, z] */
export type Landmark = number[]

const FINGER_NAMES: FingerName[] = ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky']
const CURL_NAMES: CurlName[] = ['NoCurl', 'HalfCurl', 'FullCurl']
const DIRECTION_NAMES: DirectionName[] = [
  'VerticalUp',
  'VerticalDown',
  'HorizontalLeft',
  'HorizontalRight',
  'DiagonalUpRight',
  'DiagonalUpLeft',
  'DiagonalDownRight',
  'DiagonalDownLeft'
]

export const Finger = {
  Thumb: 0,
  Index: 1,
  Middle: 2,
  Ring: 3,
  Pinky: 4,
  all: [0, 1, 2, 3, 4],
  getName: (finger: number) => FINGER_NAMES[finger]
}

export const FingerCurl = {
  NoCurl: 0,
  HalfCurl: 1,
  FullCurl: 2,
  getName: (curl: number) => CURL_NAMES[curl]
}

export const FingerDirection = {
  VerticalUp: 0,
  VerticalDown: 1,
  HorizontalLeft: 2,
  HorizontalRight: 3,
  DiagonalUpRight: 4,
  DiagonalUpLeft: 5,
  DiagonalDownRight: 6,
  DiagonalDownLeft: 7,
  getName: (direction: number) => DIRECTION_NAMES[direction]
}

// The landmarks of each finger, from the wrist (0) to the tip
const FINGER_POINTS = [
  [0, 1, 2, 3, 4],
  [0, 5, 6, 7, 8],
  [0, 9, 10, 11, 12],
  [0, 13, 14, 15, 16],
  [0, 17, 18, 19, 20]
]

export type PoseEstimatorOptions = {
  /** A finger bent less than this (the angle at its middle, in degrees: 180 is straight) is half curled… */
  HALF_CURL_START_LIMIT: number
  /** …and less than this, not curled */
  NO_CURL_START_LIMIT: number
  /** How much each clue counts when voting whether a finger is vertical, diagonal or horizontal */
  DISTANCE_VOTE_POWER: number
  SINGLE_ANGLE_VOTE_POWER: number
  TOTAL_ANGLE_VOTE_POWER: number
}

const DEFAULT_OPTIONS: PoseEstimatorOptions = {
  HALF_CURL_START_LIMIT: 60.0,
  NO_CURL_START_LIMIT: 130.0,
  DISTANCE_VOTE_POWER: 1.1,
  SINGLE_ANGLE_VOTE_POWER: 0.9,
  TOTAL_ANGLE_VOTE_POWER: 1.6
}

// The distance between two landmarks, over their first `axes` coordinates
const distance = (a: Landmark, b: Landmark, axes: number) => {
  let sum = 0
  for (let axis = 0; axis < axes; axis++) {
    const difference = a[axis] - b[axis]
    sum += difference * difference
  }
  return Math.sqrt(sum)
}

// The angle of the line from a to b in the image (x, y), from 0 to 180 degrees
const slope = (a: Landmark, b: Landmark) => {
  const angle = (Math.atan((a[1] - b[1]) / (a[0] - b[0])) * 180) / Math.PI
  return angle > 0 ? 180 - angle : -angle
}

function estimateCurl(
  start: Landmark,
  mid: Landmark,
  end: Landmark,
  options: PoseEstimatorOptions
) {
  const startMid = distance(start, mid, 3)
  const startEnd = distance(start, end, 3)
  const midEnd = distance(mid, end, 3)
  const cos =
    (midEnd * midEnd + startMid * startMid - startEnd * startEnd) /
    (2 * midEnd * startMid)
  const angle = (57.2958 * Math.acos(Math.min(1, Math.max(-1, cos)))) % 180
  if (angle > options.NO_CURL_START_LIMIT) return FingerCurl.NoCurl
  if (angle > options.HALF_CURL_START_LIMIT) return FingerCurl.HalfCurl
  return FingerCurl.FullCurl
}

// Of the three distances along an axis, the one as long as `max` (fingerpose checks them in this order)
const longest = (
  startEnd: number,
  startMid: number,
  midEnd: number,
  max: number
) =>
  max === Math.abs(startEnd)
    ? startEnd
    : max === Math.abs(startMid)
      ? startMid
      : midEnd

function estimateDirection(
  start: Landmark,
  mid: Landmark,
  end: Landmark,
  slopes: number[],
  options: PoseEstimatorOptions
) {
  const startMidX = start[0] - mid[0]
  const startEndX = start[0] - end[0]
  const midEndX = mid[0] - end[0]
  const startMidY = start[1] - mid[1]
  const startEndY = start[1] - end[1]
  const midEndY = mid[1] - end[1]
  const maxX = Math.max(
    Math.abs(startMidX),
    Math.abs(startEndX),
    Math.abs(midEndX)
  )
  const maxY = Math.max(
    Math.abs(startMidY),
    Math.abs(startEndY),
    Math.abs(midEndY)
  )
  const vertical =
    longest(startEndY, startMidY, midEndY, maxY) < 0
      ? FingerDirection.VerticalDown
      : FingerDirection.VerticalUp
  const horizontal =
    longest(startEndX, startMidX, midEndX, maxX) > 0
      ? FingerDirection.HorizontalLeft
      : FingerDirection.HorizontalRight

  // Vote: whether the finger is vertical, diagonal or horizontal
  const votes = { vertical: 0, diagonal: 0, horizontal: 0 }
  const voteForAngle = (angle: number, power: number) => {
    if (angle >= 75.0 && angle <= 105.0) votes.vertical += power
    else if (angle >= 25.0 && angle <= 155.0) votes.diagonal += power
    else votes.horizontal += power
  }

  const ratio = maxY / (maxX + 0.00001)
  if (ratio > 1.5) votes.vertical += options.DISTANCE_VOTE_POWER
  else if (ratio > 0.66) votes.diagonal += options.DISTANCE_VOTE_POWER
  else votes.horizontal += options.DISTANCE_VOTE_POWER

  // The angle of the whole finger. fingerpose meant to measure it along the longest of the three segments, but only
  // moves the start to the middle point when that is the longest one
  const startMid = distance(start, mid, 2)
  const midEnd = distance(mid, end, 2)
  const longestSegment = Math.max(startMid, distance(start, end, 2), midEnd)
  const from =
    longestSegment !== startMid && longestSegment === midEnd ? mid : start
  voteForAngle(slope(from, end), options.TOTAL_ANGLE_VOTE_POWER)
  for (const angle of slopes) {
    voteForAngle(angle, options.SINGLE_ANGLE_VOTE_POWER)
  }

  // In a tie, vertical wins, then horizontal, then diagonal
  if (
    votes.vertical ===
    Math.max(votes.vertical, votes.diagonal, votes.horizontal)
  )
    return vertical
  if (votes.horizontal === Math.max(votes.diagonal, votes.horizontal))
    return horizontal
  if (vertical === FingerDirection.VerticalUp) {
    return horizontal === FingerDirection.HorizontalLeft
      ? FingerDirection.DiagonalUpLeft
      : FingerDirection.DiagonalUpRight
  }
  return horizontal === FingerDirection.HorizontalLeft
    ? FingerDirection.DiagonalDownLeft
    : FingerDirection.DiagonalDownRight
}

/** The curl and the direction of each finger (FingerCurl and FingerDirection values, by Finger) */
export function estimatePose(
  landmarks: Landmark[],
  options: PoseEstimatorOptions = DEFAULT_OPTIONS
) {
  const curls: number[] = []
  const directions: number[] = []
  for (const finger of Finger.all) {
    const points = FINGER_POINTS[finger].map((point) => landmarks[point])
    // From the wrist, except for the thumb: from its base
    const from = finger === Finger.Thumb ? 1 : 0
    const [start, mid, end] = [points[from], points[from + 2], points[4]]
    const slopes = points
      .slice(from, -1)
      .map((point, index) => slope(point, points[from + index + 1]))
    curls.push(estimateCurl(start, mid, end, options))
    directions.push(estimateDirection(start, mid, end, slopes, options))
  }
  return { curls, directions }
}

/** A letter: the curls and directions each finger may have, each with how much it adds to the score when it matches */
export class GestureDescription {
  /** By Finger: [FingerCurl, weight] pairs */
  readonly curls: Record<number, Array<[number, number]>> = {}
  /** By Finger: [FingerDirection, weight] pairs */
  readonly directions: Record<number, Array<[number, number]>> = {}

  constructor(readonly name: string) {}

  addCurl(finger: number, curl: number, weight = 1.0) {
    this.curls[finger] ??= []
    this.curls[finger].push([curl, weight])
  }

  addDirection(finger: number, direction: number, weight = 1.0) {
    this.directions[finger] ??= []
    this.directions[finger].push([direction, weight])
  }

  /**
   * How well the detected curls and directions (by Finger) match this letter, from 0 to 10: the average weight of what
   * matches, over the curls and directions the letter describes. What does not match adds nothing (fingerpose meant to
   * subtract a penalty, but it was always 0)
   */
  matchAgainst(detectedCurls: number[], detectedDirections: number[]) {
    let score = 0
    let described = 0
    const match = (
      detected: number[],
      expected: Record<number, Array<[number, number]>>
    ) => {
      detected.forEach((value, finger) => {
        if (expected[finger] === undefined) return
        described++
        score += expected[finger].find(([option]) => option === value)?.[1] ?? 0
      })
    }
    match(detectedCurls, this.curls)
    match(detectedDirections, this.directions)
    return (score / described) * 10
  }
}

/** Scores the letters against the landmarks of a hand, from 0 to 10, as fingerpose's GestureEstimator does */
export class GestureEstimator {
  private readonly options: PoseEstimatorOptions

  constructor(
    readonly gestures: GestureDescription[],
    options: Partial<PoseEstimatorOptions> = {}
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
  }

  /** The letters that score at least `minScore`, and what each finger is doing */
  estimate(landmarks: Landmark[], minScore: number) {
    const { curls, directions } = estimatePose(landmarks, this.options)
    const fingers: FingerPose[] = Finger.all.map((finger) => ({
      finger: Finger.getName(finger),
      curl: FingerCurl.getName(curls[finger]),
      direction: FingerDirection.getName(directions[finger])
    }))
    const gestures = this.gestures
      .map((gesture) => ({
        name: gesture.name,
        score: gesture.matchAgainst(curls, directions)
      }))
      .filter(({ score }) => score >= minScore)
    return { fingers, gestures }
  }
}
