import {
  Finger,
  FingerCurl,
  FingerDirection,
  GestureDescription
} from 'fingerpose'

const tSign = new GestureDescription('T')
// [
//     [
//       "Thumb",
//       "No Curl",
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
tSign.addCurl(Finger.Thumb, FingerCurl.NoCurl, 1.0)
tSign.addDirection(Finger.Index, FingerDirection.VerticalUp, 0.7)

// Index
tSign.addCurl(Finger.Index, FingerCurl.FullCurl, 1)
tSign.addDirection(Finger.Index, FingerDirection.DiagonalUpRight, 0.7)

// Middle
tSign.addCurl(Finger.Middle, FingerCurl.FullCurl, 1)
tSign.addDirection(Finger.Middle, FingerDirection.VerticalUp, 0.7)

// Ring
tSign.addCurl(Finger.Ring, FingerCurl.FullCurl, 1)
tSign.addDirection(Finger.Ring, FingerDirection.VerticalUp, 0.7)

// Pinky
tSign.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1)
tSign.addDirection(Finger.Pinky, FingerDirection.DiagonalUpLeft, 0.7)

export { tSign }
