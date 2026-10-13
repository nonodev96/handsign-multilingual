# Hand Sign multilingual

[![npm](https://img.shields.io/npm/v/handsign-multilingual)](https://www.npmjs.com/package/handsign-multilingual)
[![Demo](https://img.shields.io/badge/demo-GitHub%20Pages-blue)](https://nonodev96.github.io/handsign-multilingual/)

Fingerspelling recognition for JavaScript: give it the hands that
[hand-pose-detection](https://github.com/tensorflow/tfjs-models/tree/master/hand-pose-detection) finds in a video and
it tells you which letter each hand is signing, in American or Spanish Sign Language.

- **Two ways to recognise**: rules that need no data (how each finger is curled and where it points), or a classifier
  that compares the hand with recorded samples, ready-made for the American alphabet.
- **Letters with movement**: LL, Ñ and RR, followed along the frames of the video.
- **Any hand, any camera**: the left hand and mirrored (selfie) video work with the same letters.
- **No other dependencies**: TypeScript, ESM and CommonJS, in the browser and in Node.

**[Try the demo](https://nonodev96.github.io/handsign-multilingual/)** with your camera.

| Language                    | Code | Still letters | With movement | Ready-made samples        |
| --------------------------- | ---- | ------------- | ------------- | ------------------------- |
| American Sign Language      | ASL  | A–Z           |               | 2122 hands (`SamplesASL`) |
| Spanish Sign Language (LSE) | SSL  | A–Z           | LL, Ñ, RR     | Record your own           |

## Install

```bash
pnpm add handsign-multilingual @tensorflow-models/hand-pose-detection
```

## Quick start

The most accurate way: the classifier with the ready-made American samples (92 % right with real hands, see
[How well it recognises](#how-well-it-recognises)).

```js
import * as handPoseDetection from '@tensorflow-models/hand-pose-detection'
import { HandSignClassifier } from 'handsign-multilingual'
import { SamplesASL } from 'handsign-multilingual/samples'

const detector = await handPoseDetection.createDetector(handPoseDetection.SupportedModels.MediaPipeHands, {
  runtime: 'mediapipe', // or 'tfjs'
  solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands',
  modelType: 'full'
})
const classifier = HandSignClassifier.fromJSON(SamplesASL)

// input: a video, an image or a canvas
for (const hand of await detector.estimateHands(input)) {
  const [best] = classifier.predict(hand)
  console.log(best) // { letter: 'A', score: 1, distance: 0.21 }
}
```

### Which one to use

|                   | Rules (`createHandSignEstimator`)                      | Samples (`HandSignClassifier`)                       |
| ----------------- | ------------------------------------------------------ | ---------------------------------------------------- |
| Needs             | Nothing                                                | Samples: `SamplesASL`, or 5–20 per letter you record |
| Right, real hands | 38 %                                                   | 92 %                                                 |
| Explains itself   | Yes: what each finger does and what the letter expects | No: only which samples are closest                   |
| Copes with        | The hand as the letter is described                    | Each person's way of signing, camera angles          |

The rules are a good start for a language without samples and to explain to a learner what is wrong. For recognition
you can rely on, use samples. Both take the hand as hand-pose-detection returns it.

## Recognise letters with the rules

`createHandSignEstimator` returns the letters that reach `minScore`, best first, scored from 0 to 1 (1: everything the
letter describes matches), and what each finger is doing:

```js
import { HandSignsASL, createHandSignEstimator, describeSign } from 'handsign-multilingual'

const estimator = createHandSignEstimator(HandSignsASL, { minScore: 0.8 })

const { letters, fingers } = estimator.estimate(hand)
letters[0] // { letter: 'B', score: 1 }
fingers[0] // { finger: 'Thumb', curl: 'HalfCurl', direction: 'DiagonalUpRight' }

// What a letter expects of each finger, to explain why a hand does not match it
describeSign(HandSignsASL.signs.bSign)[0]
// {
//   finger: 'Thumb',
//   curls: [{ curl: 'HalfCurl', weight: 1 }],
//   directions: [{ direction: 'DiagonalUpLeft', weight: 0.7 }, { direction: 'DiagonalUpRight', weight: 0.7 }]
// }
```

## Recognise letters with your own samples

`HandSignClassifier` compares the hand with recorded samples (k nearest neighbours). A few samples of each letter from
the person who will sign are usually enough, and they can go on top of the ready-made ones:

```js
import { HandSignClassifier } from 'handsign-multilingual'

const classifier = new HandSignClassifier({ k: 5 })
classifier.add('A', hand) // record samples of each letter
classifier.counts() // { A: 12, B: 10, ... }

const [best] = classifier.predict(hand) // { letter: 'A', score: 1, distance: 0.12 }
classifier.crossValidate() // { accuracy: 0.97, total: 260, confusion: { ... } }

// Save them and load them later
const json = JSON.stringify(classifier.toJSON('ASL'))
const again = HandSignClassifier.fromJSON(json)
```

`score` is the letter's share of the vote of the closest samples; `distance` is how far the hand is from the closest
sample of that letter, to discard hands that look like no letter at all.

## Letters with movement

LL, Ñ and RR (Spanish) are made with the handshape of L, N and R and a movement: LL and RR move to the side of the
hand that signs, Ñ goes from side to side. That is why they are in `HandSignsSSL.motions`, not in `signs`.
`HandMotionTracker` follows a hand along the frames of a video and recognises them when the hand keeps the base letter
while it moves. One tracker per hand:

```js
import { HandMotionTracker, HandSignsSSL, createHandSignEstimator } from 'handsign-multilingual'

const estimator = createHandSignEstimator(HandSignsSSL)
const tracker = new HandMotionTracker(HandSignsSSL.motions)

// For each frame: the hand, and the letter recognised in it without movement (from the rules or the classifier)
const letter = estimator.estimate(hand).letters[0]?.letter ?? null
const moved = tracker.update(hand, letter, performance.now()) // 'LL', 'Ñ', 'RR' or null
```

The movements are measured in sizes of the palm, so they do not depend on how close the hand is. The tracker needs the
2D `keypoints` of the hand, and its thresholds can be changed: `windowMs`, `minShift`, `minSwing`, `minReversals` and
`minBaseShare`.

## Left hand and mirrored video

The letters are described for a right hand in a non-mirrored image. Everything in the library first brings the hand to
that frame (`canonicalLandmarks`), using the label MediaPipe gives it, so the letters work with either hand and with
mirrored input (`flipHorizontal: true`). Hands without a label (other trackers, datasets) are labelled from their shape
(`inferHandedness`). `signingHand(hand, { mirrored })` tells you which hand is signing.

## Pictures of the letters

In their own entry, so they only weigh on apps that show them (inlined as data URLs):

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

## Describe your own letters or gestures

The letters are `GestureDescription`s: for each finger, the curls (`NoCurl`, `HalfCurl`, `FullCurl`) and directions it
may have, each with a weight. Any set of them is a language for `createHandSignEstimator`:

```js
import {
  Finger,
  FingerCurl,
  FingerDirection,
  GestureDescription,
  createHandSignEstimator
} from 'handsign-multilingual'

const pointing = new GestureDescription('☝️')
pointing.addCurl(Finger.Index, FingerCurl.NoCurl, 1)
pointing.addDirection(Finger.Index, FingerDirection.VerticalUp, 0.7)
for (const finger of [Finger.Thumb, Finger.Middle, Finger.Ring, Finger.Pinky]) {
  pointing.addCurl(finger, FingerCurl.FullCurl, 1)
  pointing.addCurl(finger, FingerCurl.HalfCurl, 0.9) // also accepted, scoring a bit less
  pointing.addDirection(finger, FingerDirection.VerticalUp, 0.7)
}

const estimator = createHandSignEstimator({ signs: { pointing } })
estimator.estimate(hand).letters // [{ letter: '☝️', score: 1 }] with a hand pointing up
```

Describe the five fingers, with weight 1 for the main curl and 0.7 for directions like the built-in letters, so that
no letter wins just because it weighs more. Directions are in the frame of a right hand in a non-mirrored image (x to
the right, y down).

`GestureEstimator` gives the raw scores, from 0 to 10 (a hand that matches a letter completely scores about 8.5). It is
[fingerpose](https://github.com/andypotato/fingerpose)'s estimation ported to TypeScript, with the same results:

```js
import { GestureEstimator, HandSignsASL, canonicalLandmarks } from 'handsign-multilingual'

const estimator = new GestureEstimator(Object.values(HandSignsASL.signs))
const { gestures, fingers } = estimator.estimate(canonicalLandmarks(hand), 7)
```

## How well it recognises

Measured with real hands: [ASLNow!](https://huggingface.co/datasets/sid220/asl-now-fingerspelling) (MIT), 2122
samples of several people signing the American letters (`pnpm evaluate`, see `packages/handsign-multilingual/data`):

|                                                                            | Right                                               |
| -------------------------------------------------------------------------- | --------------------------------------------------- |
| Rules, best letter                                                         | 38 %                                                |
| Rules, letters that reach 80 %                                             | 54 % of the hands reach it, 50 % of those are right |
| Samples (`HandSignClassifier`, 5 folds, takes of the same moment together) | 92 %                                                |
| `SamplesASL` (the same, one byte per value)                                | 92 %                                                |

The rules fail most with H, V, N, O, Z, S, J and M (O is taken for C, H for Z, N for T, V for U). With samples every
letter is between 71 % and 100 %; S and A, and P and Q, are the most confused. The dataset does not say who made each
sample, so the same person can be in the samples and in the hands recognised: with a new person, expect less.

`SamplesASL` weighs about 180 kB, in its own entry (`handsign-multilingual/samples`). There are no Spanish samples yet:
the demo can record them and download them.

Most Spanish letters still use the description and the picture of the American letter, and are being reviewed against
the Spanish fingerspelling alphabet. Samples avoid the differences.

## API

| Export                                                                                              | What it does                                                        |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `HandSignsASL`, `HandSignsSSL`                                                                      | The alphabets: `signs` (still letters) and `motions`                |
| `createHandSignEstimator(language, { minScore })`                                                   | Letters by the rules, scored from 0 to 1, and what each finger does |
| `describeSign(sign)`                                                                                | What a letter expects of each finger                                |
| `HandSignClassifier`                                                                                | Letters by recorded samples (k nearest neighbours)                  |
| `HandMotionTracker`                                                                                 | Letters with movement, along the frames of a video                  |
| `canonicalLandmarks`, `inferHandedness`, `signingHand`                                              | The hand in the frame the letters are described in, and its side    |
| `GestureDescription`, `GestureEstimator`, `estimatePose`, `Finger`, `FingerCurl`, `FingerDirection` | Describe letters and score them (0 to 10)                           |
| `SamplesASL` (`handsign-multilingual/samples`)                                                      | Ready-made samples of the American alphabet                         |
| `SignImagesASL`, `SignImagesSSL` (`handsign-multilingual/images`)                                   | Pictures of the letters, as data URLs                               |

Everything is typed: see the TypeScript declarations for the options and the returned objects.

## Demo

[The demo](https://nonodev96.github.io/handsign-multilingual/) (`examples/react`) shows everything: live recognition
with the reasons for each letter, writing text by holding letters, the alphabets, recording and evaluating your own
samples, and practice. Run it locally with `pnpm dev:react` (see [Development](#development)).

## Roadmap

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

More about them: [List of sign languages](https://en.wikipedia.org/wiki/List_of_sign_languages),
[A Guide to Different Sign Languages Around the World](https://www.wikihow.com/Types-of-Sign-Language).

## Development

pnpm 12 (`packageManager` in package.json). The library is in `packages/handsign-multilingual`, and the demo in
`examples/react`.

```bash
pnpm install
pnpm test               # vitest
pnpm lint
pnpm typecheck
pnpm build:package      # packages/handsign-multilingual/dist
pnpm dev:react          # the demo, at http://localhost:5173/handsign-multilingual/
pnpm dev:react:https    # the same over HTTPS, to use the camera from other devices
pnpm build:react        # the demo for GitHub Pages
```

The demo uses the library from `dist`: run `pnpm build:package` (or `pnpm dev:package` to rebuild it on every change)
after changing it.

Each push to `main` that changes the library or the demo publishes the demo on GitHub Pages
(`.github/workflows/deploy-demo.yaml`).

To publish a version on npm, set `version` in `packages/handsign-multilingual/package.json` and publish a GitHub
release with the tag `v<version>` (e.g. `v0.4.0`): `.github/workflows/publish-npm.yaml` checks that the tag matches,
runs the checks (typecheck, lint, tests, build) and publishes it with provenance. Versions with a pre-release
(`0.5.0-beta.1`) go to the `next` dist-tag. It can also be run by hand from the Actions tab, as a dry run.

## Credits and license

BSD-2-Clause. The American Sign Language descriptions and images come from
[syauqy/handsign-tensorflow](https://github.com/syauqy/handsign-tensorflow) (BSD-2-Clause), the finger pose estimation
from [fingerpose](https://github.com/andypotato/fingerpose) (MIT) and the ready-made samples from
[ASLNow!](https://huggingface.co/datasets/sid220/asl-now-fingerspelling) (MIT). See
[LICENSE](https://github.com/nonodev96/handsign-multilingual/blob/main/LICENSE).
