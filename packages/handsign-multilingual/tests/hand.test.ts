import { describe, expect, test } from 'vitest'
import { canonicalLandmarks, inferHandedness, signingHand } from '../src'
import { type SyntheticHand, detectedHand } from './syntheticHand'

const points = (count: number) =>
  Array.from({ length: count }, (_, i) => ({ x: i, y: -i, z: i / 10 }))

describe('canonicalLandmarks', () => {
  test('returns [x, y, z] arrays, from keypoints3D when there are', () => {
    const landmarks = canonicalLandmarks({
      keypoints3D: points(21),
      keypoints: [],
      handedness: 'Left'
    })
    expect(landmarks[3]).toEqual([3, -3, 0.3])
  })

  test('uses the 2D keypoints when there are no 3D ones, with z = 0', () => {
    const keypoints = points(21).map(({ x, y }) => ({ x, y }))
    expect(canonicalLandmarks({ keypoints, handedness: 'Left' })[2]).toEqual([
      2, -2, 0
    ])
  })

  test('mirrors a hand labelled "Right": it looks like a left hand in the frame the letters are described in', () => {
    const landmarks = canonicalLandmarks({
      keypoints3D: points(21),
      handedness: 'Right'
    })
    expect(landmarks[3]).toEqual([-3, -3, 0.3])
  })

  test('needs the 21 landmarks', () => {
    expect(() => canonicalLandmarks({ keypoints3D: points(5) })).toThrow(
      '21 keypoints'
    )
    expect(() => canonicalLandmarks({})).toThrow('got 0')
  })
})

describe('signingHand', () => {
  test.each([
    ['Left', false, 'right'],
    ['Right', false, 'left'],
    ['Left', true, 'left'],
    ['Right', true, 'right']
  ] as const)(
    'labelled %s, mirrored input %s: the %s hand',
    (handedness, mirrored, expected) => {
      expect(signingHand({ handedness }, { mirrored })).toBe(expected)
    }
  )

  test('without a label it does not know', () => {
    expect(signingHand({})).toBeUndefined()
  })
})

describe('inferHandedness', () => {
  const folded = { curl: 'folded', angle: 90 } as const
  const straight = (angle: number) => ({ curl: 'straight', angle }) as const
  const L: SyntheticHand = {
    thumb: straight(45),
    index: straight(90),
    middle: folded,
    ring: folded,
    pinky: folded
  }
  const turn = (
    points: Array<{ x: number; y: number; z?: number }>,
    degrees: number
  ) => {
    const radians = (degrees * Math.PI) / 180
    return points.map(({ x, y, z }) => ({
      x: x * Math.cos(radians) - y * Math.sin(radians),
      y: x * Math.sin(radians) + y * Math.cos(radians),
      z
    }))
  }

  test('a right hand with the palm to the camera, as MediaPipe labels it: "Left"', () => {
    expect(inferHandedness(detectedHand(L).keypoints ?? [])).toBe('Left')
  })

  test('its mirror image (a left hand, or a selfie view): "Right"', () => {
    expect(
      inferHandedness(detectedHand(L, { mirrored: true }).keypoints ?? [])
    ).toBe('Right')
  })

  test.each([45, 90, 180, 270])(
    'it does not depend on how the hand is turned (%i°)',
    (degrees) => {
      expect(
        inferHandedness(turn(detectedHand(L).keypoints ?? [], degrees))
      ).toBe('Left')
      expect(
        inferHandedness(
          turn(detectedHand(L, { mirrored: true }).keypoints ?? [], degrees)
        )
      ).toBe('Right')
    }
  )

  test('canonicalLandmarks uses it when the hand has no label', () => {
    const { keypoints3D } = detectedHand(L, { mirrored: true })
    expect(canonicalLandmarks({ keypoints3D })).toEqual(
      canonicalLandmarks(detectedHand(L))
    )
  })
})
