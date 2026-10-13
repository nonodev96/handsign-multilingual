/** A point as hand-pose-detection returns it, in `keypoints` (pixels) or `keypoints3D` (meters) */
export type HandPoint = { x: number; y: number; z?: number }

/** A hand as hand-pose-detection returns it: only what this library uses */
export type DetectedHand = {
  keypoints?: HandPoint[]
  keypoints3D?: HandPoint[]
  handedness?: string
}

export const LANDMARK_COUNT = 21

const WRIST = 0
const INDEX_FINGER_BASE = 5
const PINKY_BASE = 17

/**
 * The label MediaPipe would give the hand, from its shape, for hands that come without one (other trackers, datasets).
 * Going from the wrist, the base of the index finger is on one side of the base of the little finger or on the other:
 * "Left" when it looks like a right hand with the palm to the camera in a non-mirrored image (the frame the letters are
 * described in), "Right" when it looks like its mirror image. It does not depend on how the hand is turned; with the
 * hand edge-on to the camera there is no telling (undefined)
 */
export function inferHandedness(
  points: HandPoint[]
): 'Left' | 'Right' | undefined {
  if (points.length < LANDMARK_COUNT) return undefined
  const wrist = points[WRIST]
  const index = points[INDEX_FINGER_BASE]
  const pinky = points[PINKY_BASE]
  const cross =
    (index.x - wrist.x) * (pinky.y - wrist.y) -
    (index.y - wrist.y) * (pinky.x - wrist.x)
  if (cross === 0) return undefined
  return cross < 0 ? 'Left' : 'Right'
}

/**
 * The 21 landmarks as [x, y, z] arrays (what GestureEstimator takes), in the frame the letters are described in: a right hand
 * in a non-mirrored image, x to the right and y down. Uses `keypoints3D` when there are, `keypoints` otherwise.
 *
 * MediaPipe labels each hand as if the image were mirrored, so a hand labelled "Right" looks like a left hand here and
 * its x is mirrored. That holds whether the input was flipped (`flipHorizontal`) or not: the label and the coordinates
 * come from the same image. It also makes the letters work with the left hand. Without a label, it is inferred from
 * the shape of the hand (inferHandedness)
 */
export function canonicalLandmarks(hand: DetectedHand): number[][] {
  const points = hand.keypoints3D?.length ? hand.keypoints3D : hand.keypoints
  if (!points || points.length !== LANDMARK_COUNT) {
    throw new Error(
      `A hand needs ${LANDMARK_COUNT} keypoints, got ${points?.length ?? 0}`
    )
  }
  const handedness = hand.handedness ?? inferHandedness(points)
  const mirror = handedness === 'Right' ? -1 : 1
  return points.map(({ x, y, z = 0 }) => [x * mirror, y, z])
}

/**
 * The hand that is signing. MediaPipe's label is right for mirrored input (`flipHorizontal: true`, a selfie view) and
 * swapped otherwise
 */
export function signingHand(
  hand: DetectedHand,
  { mirrored = false }: { mirrored?: boolean } = {}
): 'left' | 'right' | undefined {
  if (hand.handedness !== 'Left' && hand.handedness !== 'Right')
    return undefined
  const isRight = hand.handedness === 'Right'
  return isRight === mirrored ? 'right' : 'left'
}
