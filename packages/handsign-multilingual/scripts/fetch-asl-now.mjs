// Downloads the ASLNow! fingerspelling dataset (MIT, https://huggingface.co/datasets/sid220/asl-now-fingerspelling)
// into data/asl-now.json: the 21 MediaPipe hand landmarks of each sample, by letter. Pinned to the revision of the day
// it runs, so the evaluation can be repeated with the same data.
//
//   node scripts/fetch-asl-now.mjs
import { writeFile } from 'node:fs/promises'

const DATASET = 'sid220/asl-now-fingerspelling'
const API = `https://huggingface.co/api/datasets/${DATASET}`
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
const CONCURRENCY = 4
const RETRIES = 8
const round = (value) => Math.round(value * 1e5) / 1e5

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Hugging Face limits the requests without an account (HTTP 429): wait as it says, or longer each time, and retry
const json = async (url) => {
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(url)
    if (response.ok) return response.json()
    if (response.status !== 429 || attempt >= RETRIES) throw new Error(`${response.status} ${url}`)
    const retryAfter = Number(response.headers.get('retry-after'))
    await wait(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2000 * 2 ** attempt)
  }
}

const { sha } = await json(API)
const files = []
for (const letter of LETTERS) {
  const entries = await json(`${API}/tree/${sha}/${letter}`)
  for (const { path } of entries) if (path.endsWith('.json')) files.push({ letter, path })
}

const samples = []
let invalid = 0
for (let start = 0; start < files.length; start += CONCURRENCY) {
  const batch = files.slice(start, start + CONCURRENCY)
  const results = await Promise.all(
    batch.map(({ path }) => json(`https://huggingface.co/datasets/${DATASET}/resolve/${sha}/${path}`).catch(() => null))
  )
  results.forEach((points, index) => {
    const valid =
      Array.isArray(points) &&
      points.length === 21 &&
      points.every((point) => ['x', 'y', 'z'].every((axis) => Number.isFinite(point?.[axis])))
    if (!valid) {
      invalid++
      return
    }
    const { letter, path } = batch[index]
    samples.push({ id: path.split('/')[1].replace('.json', ''), letter, landmarks: points.map(({ x, y, z }) => [round(x), round(y), round(z)]) })
  })
  if ((start / CONCURRENCY) % 25 === 0) console.log(`${Math.min(start + CONCURRENCY, files.length)}/${files.length}`)
}
samples.sort((a, b) => a.letter.localeCompare(b.letter) || a.id.localeCompare(b.id))

await writeFile(
  new URL('../data/asl-now.json', import.meta.url),
  `${JSON.stringify({
    source: `https://huggingface.co/datasets/${DATASET}`,
    revision: sha,
    license: 'MIT',
    language: 'ASL',
    aspect: Math.round((4 / 3) * 1e6) / 1e6,
    aspectNote: 'Assumed (4:3, the usual webcam): the dataset does not say the size of the images.',
    description:
      'ASLNow! fingerspelling: several participants signing American Sign Language letters into a camera. 21 MediaPipe hand landmarks per sample: x and y normalised by the width and height of the image, z with the wrist as origin and roughly the scale of x. There is no handedness label.',
    samples
  })}\n`
)
console.log(`\n${samples.length} samples (${invalid} invalid) from revision ${sha}`)
