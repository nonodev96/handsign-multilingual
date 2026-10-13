## 0.4.0 (unreleased)

Breaking: only `dist` is published, fingerpose is no longer a dependency (its estimation is ported to TypeScript and exported: `GestureDescription`, `GestureEstimator`…), `sum` and `HandSignsTest` are gone, the images
moved to `handsign-multilingual/images`, and `HandSignsSSL.signs` has no LL, Ñ and RR (they are in `motions`).

* fix: the thumb direction of every letter described the index finger
* fix: the left hand and mirrored images (`flipHorizontal`) are brought to the frame the letters are described in
* fix: the Y of the Spanish alphabet weighed more than the other letters
* feat: `createHandSignEstimator` (scores from 0 to 1, what each finger is doing) and `describeSign`
* feat: `HandSignClassifier`, letters from recorded samples (k nearest neighbours)
* feat: `HandMotionTracker`, LL, Ñ and RR by their movement
* feat: `inferHandedness`, the label of a hand from its shape
* feat: `handsign-multilingual/images`, the pictures as data URLs
* feat: `handsign-multilingual/samples`, ready-made samples of American Sign Language (ASLNow!, MIT): from 38 % to 92 %
* test: rules, samples, motions and accuracy with real hands (ASLNow!)
* docs: README, demo rewritten (live recognition, alphabet, training, practice)
* build: pnpm 12, publish from packages/handsign-multilingual

## 1.0.0 (2024-07-29)

* fix(commitlint): :memo: package and husky ([ad90072](https://github.com/nonodev96/handsign-multilingual/commit/ad90072))
* feat(commitlint): :memo: add commitlint and husky ([ff8ec6e](https://github.com/nonodev96/handsign-multilingual/commit/ff8ec6e))
* add debug tool ([1d67249](https://github.com/nonodev96/handsign-multilingual/commit/1d67249))
* add license, update readme and package.json ([acf6ba8](https://github.com/nonodev96/handsign-multilingual/commit/acf6ba8))
* American Sign Language and Spanish Sign Language ([ea8086f](https://github.com/nonodev96/handsign-multilingual/commit/ea8086f))
* env node and browser save changes ([da870df](https://github.com/nonodev96/handsign-multilingual/commit/da870df))
* example react ([7012385](https://github.com/nonodev96/handsign-multilingual/commit/7012385))
* example react ([fda379e](https://github.com/nonodev96/handsign-multilingual/commit/fda379e))
* Images Spanish sign language ([684ec2a](https://github.com/nonodev96/handsign-multilingual/commit/684ec2a))
* jest with typescript, added svg transform ([a6067d4](https://github.com/nonodev96/handsign-multilingual/commit/a6067d4))
* npm publish ([ddd9697](https://github.com/nonodev96/handsign-multilingual/commit/ddd9697))
* refactor to typescript and module CommonJS ([36fce0f](https://github.com/nonodev96/handsign-multilingual/commit/36fce0f))
* remove jest for cypress and examples ([d9d7aea](https://github.com/nonodev96/handsign-multilingual/commit/d9d7aea))
* save changes ([c068764](https://github.com/nonodev96/handsign-multilingual/commit/c068764))
* tailwindcss, types, fix hands left and right ([73d44dd](https://github.com/nonodev96/handsign-multilingual/commit/73d44dd))
* update readme ([c4b0d4e](https://github.com/nonodev96/handsign-multilingual/commit/c4b0d4e))
* webcam selector ([3f02bc2](https://github.com/nonodev96/handsign-multilingual/commit/3f02bc2))



