# Hand Sign multilingual

[![npm](https://img.shields.io/npm/v/handsign-multilingual)](https://www.npmjs.com/package/handsign-multilingual)
[![Demo](https://img.shields.io/badge/demo-GitHub%20Pages-blue)](https://nonodev96.github.io/handsign-multilingual/)

Fingerspelling recognition in JavaScript. Give it the hands that
[hand-pose-detection](https://github.com/tensorflow/tfjs-models/tree/master/hand-pose-detection) finds in a video, and
it tells you which letter each one is signing.

| Language                     | Letters             | Ready-made samples |
| ---------------------------- | ------------------- | ------------------ |
| American Sign Language (ASL) | A–Z                 | Yes (`SamplesASL`) |
| Spanish Sign Language (SSL)  | A–Z, plus LL, Ñ, RR | Record your own    |

Works with either hand and with mirrored (selfie) video, in the browser and in Node, with no other dependencies.

**[Try the demo](https://nonodev96.github.io/handsign-multilingual/)** with your camera.

## Install

```bash
pnpm add handsign-multilingual @tensorflow-models/hand-pose-detection
```

## Quick start

```js
import * as handPoseDetection from '@tensorflow-models/hand-pose-detection'
import { HandSignClassifier } from 'handsign-multilingual'
import { SamplesASL } from 'handsign-multilingual/samples'

const detector = await handPoseDetection.createDetector(handPoseDetection.SupportedModels.MediaPipeHands, {
  runtime: 'mediapipe',
  solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands',
  modelType: 'full'
})
const classifier = HandSignClassifier.fromJSON(SamplesASL)

for (const hand of await detector.estimateHands(video)) {
  const [best] = classifier.predict(hand)
  console.log(best) // { letter: 'A', score: 1, distance: 0.21 }
}
```

## Two ways to recognise letters

|                       | Samples (`HandSignClassifier`)                  | Rules (`createHandSignEstimator`)            |
| --------------------- | ----------------------------------------------- | -------------------------------------------- |
| Needs                 | Samples: `SamplesASL`, or 5–20 per letter       | Nothing                                      |
| Right with real hands | **92 %**                                        | 38 %                                         |
| Good for              | Reliable recognition, each person's own signing | Languages without samples, explaining errors |

Measured with 2122 real hands from the [ASLNow!](https://huggingface.co/datasets/sid220/asl-now-fingerspelling)
dataset (`pnpm evaluate`). The same people can be in the samples and in the hands tested, so expect less with someone
new.

### With samples

`HandSignClassifier` compares the hand with recorded samples (k nearest neighbours). Start from `SamplesASL`, add
samples of the person who will sign, or record a whole alphabet:

```js
const classifier = new HandSignClassifier({ k: 5 })
classifier.add('A', hand) // a few samples of each letter
classifier.predict(hand) // [{ letter: 'A', score: 1, distance: 0.12 }, ...]
classifier.crossValidate() // { accuracy: 0.97, total: 260, confusion: { ... } }

localStorage.samples = JSON.stringify(classifier.toJSON('ASL'))
const again = HandSignClassifier.fromJSON(localStorage.samples)
```

`score` is the letter's share of the vote; a large `distance` means the hand looks like no sample at all.

### With rules

Each letter is described by how each finger is curled and where it points. `createHandSignEstimator` returns the
letters that match, scored from 0 to 1, and what each finger is doing:

```js
import { HandSignsASL, createHandSignEstimator, describeSign } from 'handsign-multilingual'

const estimator = createHandSignEstimator(HandSignsASL, { minScore: 0.8 })
const { letters, fingers } = estimator.estimate(hand)
letters[0] // { letter: 'B', score: 1 }
fingers[0] // { finger: 'Thumb', curl: 'HalfCurl', direction: 'DiagonalUpRight' }

describeSign(HandSignsASL.signs.bSign) // what B expects of each finger, to explain a mismatch
```

## Letters with movement

LL, Ñ and RR are the handshapes of L, N and R plus a movement, so they are in `HandSignsSSL.motions`: LL and RR move
to the side of the hand that signs, Ñ goes from side to side (moving the hand or turning the wrist).
`HandMotionTracker` follows one hand across the frames of a video:

```js
import { HandMotionTracker, HandSignsSSL } from 'handsign-multilingual'

const tracker = new HandMotionTracker(HandSignsSSL.motions)

// For each frame: the hand and what was recognised in it, the letters with their scores (or only the best letter)
const moved = tracker.update(hand, estimator.estimate(hand).letters, performance.now()) // 'LL', 'Ñ', 'RR' or null
```

A shift is recognised a moment after the hand stops going that way (150 ms), and a long shake is a single Ñ. The frames
without a letter (the hand is blurred while it moves fast) do not count against the base letter, which also counts when
it comes second but close. `pnpm evaluate:motion` measures it in simulated takes: trembling landmarks, blurred letters,
15 to 30 frames per second.

## Pictures of the letters

```js
import { SignImagesASL, SignImagesSSL } from 'handsign-multilingual/images'

SignImagesASL.A // { letter: 'A', sign: 'data:image/svg+xml,...', hand: 'data:image/svg+xml,...' }
```

<details>
<summary>American alphabet (ASL)</summary>

![American Sign Language (ASL)](https://raw.githubusercontent.com/nonodev96/handsign-multilingual/main/.github/ASL.png)

</details>

<details>
<summary>Spanish alphabet (SSL)</summary>

![Spanish Sign Language (SSL)](https://raw.githubusercontent.com/nonodev96/handsign-multilingual/main/.github/SSL.png)

</details>

Most Spanish letters still use the description and picture of the American letter while they are reviewed. Recording
your own samples avoids the differences.

## Your own gestures

Describe each finger's curl and direction, with a weight (1 for curls and 0.7 for directions, like the built-in
letters). Directions are as seen in a non-mirrored image of a right hand:

```js
import { Finger, FingerCurl, FingerDirection, GestureDescription, createHandSignEstimator } from 'handsign-multilingual'

const pointing = new GestureDescription('☝️')
pointing.addCurl(Finger.Index, FingerCurl.NoCurl, 1)
pointing.addDirection(Finger.Index, FingerDirection.VerticalUp, 0.7)
for (const finger of [Finger.Thumb, Finger.Middle, Finger.Ring, Finger.Pinky]) {
  pointing.addCurl(finger, FingerCurl.FullCurl, 1)
  pointing.addDirection(finger, FingerDirection.VerticalUp, 0.7)
}

createHandSignEstimator({ signs: { pointing } }).estimate(hand).letters // [{ letter: '☝️', score: 1 }]
```

The estimation is [fingerpose](https://github.com/andypotato/fingerpose)'s, ported to TypeScript with the same
results; `GestureEstimator` gives its raw scores (0 to 10).

## Development

The library is in `packages/handsign-multilingual` and the demo in `examples/react` (pnpm 12).

```bash
pnpm install
pnpm test && pnpm lint && pnpm typecheck
pnpm build:package      # the library; the demo uses its dist
pnpm dev:react          # the demo, at http://localhost:5173/handsign-multilingual/
pnpm dev:react:https    # the same over HTTPS, to use the camera from other devices
```

Pushing to `main` deploys the demo to GitHub Pages. To publish on npm, set the `version` of the package and publish a
GitHub release tagged `v<version>`.

<details>
<summary>Roadmap: more sign languages</summary>

![Sign language families](https://raw.githubusercontent.com/nonodev96/handsign-multilingual/main/.github/Sign_language_families.svg)

- [x] American Sign Language (ASL), from [@syauqy](https://github.com/syauqy)
- [x] Spanish Sign Language (SSL)
- [ ] French Sign Language family
- [ ] Russian Sign Language cluster
- [ ] Czech Sign Language cluster
- [ ] Danish Sign Language family
- [ ] Swedish Sign Language family
- [ ] German Sign Language family
- [ ] Vietnamese sign languages & some Thai and Lao SLs
- [ ] Arab sign-language family
- [ ] Indo-Pakistani Sign Language
- [ ] Chinese Sign Language
- [ ] Japanese Sign Language family
- [ ] BANZSL family (British, Australian and New Zealand Sign Language)
- [ ] South African Sign Language (within the BANZSL family)
- [ ] Isolated languages

See the [list of sign languages](https://en.wikipedia.org/wiki/List_of_sign_languages).

</details>

## License

BSD-2-Clause. American letters and pictures from
[syauqy/handsign-tensorflow](https://github.com/syauqy/handsign-tensorflow) (BSD-2-Clause), finger pose estimation
from [fingerpose](https://github.com/andypotato/fingerpose) (MIT) and samples from
[ASLNow!](https://huggingface.co/datasets/sid220/asl-now-fingerspelling) (MIT). See
[LICENSE](https://github.com/nonodev96/handsign-multilingual/blob/main/LICENSE).
