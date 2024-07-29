import {
  Finger,
  FingerCurl,
  FingerDirection,
  GestureDescription
} from 'fingerpose'

const nnSign = new GestureDescription('Ñ')
// [
//     [
//       "Thumb",
//       "Half Curl",
//       "Diagonal Up Left"
//     ],
//     [
//       "Index",
//       "Full Curl",
//       "Vertical Up"
//     ],
//     [
//       "Middle",
//       "Full Curl",
//       "Vertical Up"
//     ],
//     [
//       "Ring",
//       "Full Curl",
//       "Vertical Up"
//     ],
//     [
//       "Pinky",
//       "Full Curl",
//       "Diagonal Up Left"
//     ]
//   ]

// Thumb
nnSign.addCurl(Finger.Thumb, FingerCurl.HalfCurl, 1.0)
nnSign.addDirection(Finger.Index, FingerDirection.DiagonalUpLeft, 0.7)

// Index
nnSign.addCurl(Finger.Index, FingerCurl.FullCurl, 1)
nnSign.addDirection(Finger.Index, FingerDirection.DiagonalUpRight, 0.7)

// Middle
nnSign.addCurl(Finger.Middle, FingerCurl.FullCurl, 1)
nnSign.addDirection(Finger.Middle, FingerDirection.VerticalUp, 0.7)

// Ring
nnSign.addCurl(Finger.Ring, FingerCurl.FullCurl, 1)
nnSign.addDirection(Finger.Ring, FingerDirection.VerticalUp, 0.7)

// Pinky
nnSign.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1)
nnSign.addDirection(Finger.Pinky, FingerDirection.DiagonalUpLeft, 0.7)

export { nnSign }
