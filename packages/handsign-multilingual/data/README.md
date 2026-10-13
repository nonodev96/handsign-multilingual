# Datasets

Real hands, to measure how well the letters are recognised (`pnpm evaluate`, and `tests/accuracy.test.ts` so that it
does not get worse). They are not part of the npm package.

Each file has the letter and the 21 MediaPipe hand landmarks of each sample, with x and y normalised by the width and
the height of the image and z with the scale of x. `aspect` (width / height of the images) brings x and y to the same
unit; `handedness`, when there is one, is MediaPipe's label (without it, it is inferred from the shape of the hand).

## recordings/

The hands recorded with the demo ("Train", "Save them in the repository"): `<language>-<person>.json`, one file per
person and sign language, with each sample's letter, its points in the image (divided by its height, so `aspect` is 1),
MediaPipe's label, its 3D points and who recorded it. Only coordinates: no images. `pnpm evaluate data/recordings/*`
measures them (each person recognised from the samples of the others) and `pnpm build:samples` turns those of the
Spanish alphabet into ready-made samples.

## asl-now.json

[ASLNow! fingerspelling](https://huggingface.co/datasets/sid220/asl-now-fingerspelling), American Sign Language:
2122 samples of several participants signing the 26 letters into a camera (J and Z in one position, without their
movement). The dataset does not say the size of the images: 4:3 is assumed. `node scripts/fetch-asl-now.mjs`
downloads it again, at the revision of the day.

MIT License

Copyright (c) the ASLNow! authors (https://huggingface.co/sid220)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
documentation files (the "Software"), to deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit
persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the
Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
