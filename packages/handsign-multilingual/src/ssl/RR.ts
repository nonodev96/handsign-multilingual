import {
  Finger,
  FingerCurl,
  FingerDirection,
  GestureDescription
} from 'fingerpose'

const rrSign = new GestureDescription('RR')
// [
//     [
//       "Thumb",
//       "Half Curl",
//       "Diagonal Up Left"
//     ],
//     [
//       "Index",
//       "No Curl",
//       "Diagonal Up Right"
//     ],
//     [
//       "Middle",
//       "No Curl",
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
//       "Vertical Up"
//     ]
//   ]

// Thumb
rrSign.addCurl(Finger.Thumb, FingerCurl.HalfCurl, 1.0)
rrSign.addDirection(Finger.Index, FingerDirection.DiagonalUpLeft, 0.7)

// Index
rrSign.addCurl(Finger.Index, FingerCurl.NoCurl, 1)
rrSign.addDirection(Finger.Index, FingerDirection.VerticalUp, 0.7)

// Middle
rrSign.addCurl(Finger.Middle, FingerCurl.NoCurl, 1)
rrSign.addDirection(Finger.Middle, FingerDirection.VerticalUp, 0.7)

// Ring
rrSign.addCurl(Finger.Ring, FingerCurl.FullCurl, 1)
rrSign.addDirection(Finger.Ring, FingerDirection.VerticalUp, 0.7)

// Pinky
rrSign.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1)
rrSign.addDirection(Finger.Pinky, FingerDirection.VerticalUp, 0.7)

export { rrSign }
