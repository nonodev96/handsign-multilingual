import {
  Finger,
  FingerCurl,
  FingerDirection,
  GestureDescription
} from 'fingerpose'

const llSign = new GestureDescription('LL')
// [
//     [
//       "Thumb",
//       "No Curl",
//       "Diagonal Up Right"
//     ],
//     [
//       "Index",
//       "No Curl",
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
//       "Vertical Up"
//     ]
//   ]

// Thumb
llSign.addCurl(Finger.Thumb, FingerCurl.NoCurl, 1.0)
llSign.addDirection(Finger.Index, FingerDirection.DiagonalUpRight, 0.7)

// Index
llSign.addCurl(Finger.Index, FingerCurl.NoCurl, 1)
llSign.addDirection(Finger.Index, FingerDirection.VerticalUp, 0.7)

// Middle
llSign.addCurl(Finger.Middle, FingerCurl.FullCurl, 1)
llSign.addDirection(Finger.Middle, FingerDirection.VerticalUp, 0.7)

// Ring
llSign.addCurl(Finger.Ring, FingerCurl.FullCurl, 1)
llSign.addDirection(Finger.Ring, FingerDirection.VerticalUp, 0.7)

// Pinky
llSign.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1)
llSign.addDirection(Finger.Pinky, FingerDirection.VerticalUp, 0.7)

export { llSign }
