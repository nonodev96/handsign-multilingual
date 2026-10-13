// Ready-made samples for HandSignClassifier, apart from the main entry so they only weigh on apps that use them.
// Regenerated with `pnpm build:samples` (scripts/build-samples.ts)
import type { HandSignSamplesJSON } from './classifier'
import { ASL_NOW } from './samples/asl-now'

type Packed = {
  language: string
  scale: number
  dimensions: number
  letters: ReadonlyArray<readonly [string, number]>
  data: string
}

function unpack({
  language,
  scale,
  dimensions,
  letters,
  data
}: Packed): HandSignSamplesJSON {
  const bytes = new Int8Array(
    Uint8Array.from(atob(data), (character) => character.charCodeAt(0)).buffer
  )
  const samples: HandSignSamplesJSON['samples'] = []
  let offset = 0
  for (const [letter, count] of letters) {
    for (let i = 0; i < count; i++, offset += dimensions) {
      samples.push({
        letter,
        features: Array.from(
          bytes.subarray(offset, offset + dimensions),
          (value) => value / scale
        )
      })
    }
  }
  return {
    format: 'handsign-multilingual/samples',
    version: 1,
    language,
    samples
  }
}

/**
 * American Sign Language: 2122 hands of several people (the ASLNow! dataset, MIT License), every letter. With them,
 * HandSignClassifier recognises about 92 % of the hands of that dataset it has not seen, against 38 % of the rules.
 * Add your own samples to them to recognise how you sign even better.
 *
 *   const classifier = HandSignClassifier.fromJSON(SamplesASL)
 */
export const SamplesASL: HandSignSamplesJSON = unpack(ASL_NOW)
