import {
  Finger,
  FingerCurl,
  FingerDirection,
  GestureDescription
} from 'fingerpose'

const sSign = new GestureDescription('S')
// [
//     [
//       "Thumb",
//       "Half Curl",
//       "Vertical Up"
//     ],
//     [
//       "Index",
//       "Full Curl",
//       "Diagonal Up Right"
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
sSign.addCurl(Finger.Thumb, FingerCurl.HalfCurl, 1.0)
sSign.addDirection(Finger.Index, FingerDirection.VerticalUp, 0.7)

// Index
sSign.addCurl(Finger.Index, FingerCurl.FullCurl, 1)
sSign.addDirection(Finger.Index, FingerDirection.DiagonalUpRight, 0.7)

// Middle
sSign.addCurl(Finger.Middle, FingerCurl.FullCurl, 1)
sSign.addDirection(Finger.Middle, FingerDirection.VerticalUp, 0.7)

// Ring
sSign.addCurl(Finger.Ring, FingerCurl.FullCurl, 1)
sSign.addDirection(Finger.Ring, FingerDirection.VerticalUp, 0.7)

// Pinky
sSign.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1)
sSign.addDirection(Finger.Pinky, FingerDirection.DiagonalUpLeft, 0.7)

export { sSign }
