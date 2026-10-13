import type { DetectedHand, HandPoint } from '../src'

type Curl = 'straight' | 'bent' | 'folded'
/** A finger: how bent it is and the angle it points to, in degrees (0: right, 90: up, in image coordinates) */
export type SyntheticFinger = { curl: Curl; angle: number }
export type SyntheticHand = Record<
  'thumb' | 'index' | 'middle' | 'ring' | 'pinky',
  SyntheticFinger
>

// Where each finger starts, from the wrist (image coordinates: y grows downwards)
const BASES = {
  thumb: [0.35, -0.25],
  index: [0.3, -1],
  middle: [0.1, -1.05],
  ring: [-0.1, -1],
  pinky: [-0.3, -0.9]
} as const
const LENGTHS = [0.45, 0.3, 0.25]
// How much the finger has turned towards the palm (and the camera) after each joint, in degrees. A straight finger is
// slightly bent: estimatePose takes a perfectly straight one (180°, modulo 180) as fully curled
const TURNS: Record<Curl, number[]> = {
  straight: [0, 3, 6],
  bent: [0, 45, 90],
  folded: [0, 90, 180]
}

/**
 * The 21 landmarks of a hand (MediaPipe's order) seen as a right hand in a non-mirrored image, palm to the camera. Each
 * finger points at its angle and, bent or folded, turns towards the palm at each joint
 */
export function syntheticLandmarks(hand: SyntheticHand): number[][] {
  const points: number[][] = [[0, 0, 0]]
  for (const finger of ['thumb', 'index', 'middle', 'ring', 'pinky'] as const) {
    const { curl, angle } = hand[finger]
    const radians = (angle * Math.PI) / 180
    const [dx, dy] = [Math.cos(radians), -Math.sin(radians)]
    let point = [...BASES[finger], 0]
    points.push(point)
    LENGTHS.forEach((length, joint) => {
      const turn = (TURNS[curl][joint] * Math.PI) / 180
      // Along the finger, and towards the camera (negative z) as it turns
      const [ax, ay, az] = [
        dx * Math.cos(turn),
        dy * Math.cos(turn),
        -Math.sin(turn)
      ]
      point = [
        point[0] + ax * length,
        point[1] + ay * length,
        point[2] + az * length
      ]
      points.push(point)
    })
  }
  return points
}

const toPoints = (landmarks: number[][]): HandPoint[] =>
  landmarks.map(([x, y, z]) => ({ x, y, z }))

/** Pixels per unit of the synthetic hand in the image: the palm (wrist to the base of the middle finger) is 105 px */
export const PIXELS = 100

/**
 * The hand as hand-pose-detection would return it. A right hand in a non-mirrored image is labelled "Left" (MediaPipe
 * assumes mirrored images); `mirrored` returns the same hand flipped, as from a selfie view or a left hand. In the
 * image (`keypoints`, pixels) its wrist is at `at`
 */
export function detectedHand(
  hand: SyntheticHand,
  { mirrored = false, at = { x: 320, y: 360 } } = {}
): DetectedHand {
  const landmarks = syntheticLandmarks(hand)
  const flipped = mirrored
    ? landmarks.map(([x, y, z]) => [-x, y, z])
    : landmarks
  return {
    keypoints: flipped.map(([x, y]) => ({
      x: at.x + x * PIXELS,
      y: at.y + y * PIXELS
    })),
    keypoints3D: toPoints(flipped),
    handedness: mirrored ? 'Right' : 'Left'
  }
}
