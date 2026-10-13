import { HandMotionTracker, HandSignsSSL } from '../src'
import { evaluateMotion } from '../tests/motionSimulation'

// How well HandMotionTracker recognises LL, Ñ and RR, and how often it sees one where there is none, in simulated takes
// (tests/motionSimulation.ts): pnpm evaluate:motion

// Options to try, as JSON (MOTION_OPTIONS='{"minSwing":0.2}'); with LETTERS=1 the tracker gets the letters with their
// scores instead of only the first one; SEED changes the takes
const options = JSON.parse(process.env.MOTION_OPTIONS ?? '{}')
const results = evaluateMotion(
  (frames) => {
    const tracker = new HandMotionTracker(HandSignsSSL.motions ?? [], options)
    return frames.map(({ hand, letter, letters, time }) =>
      tracker.update(hand, process.env.LETTERS ? letters : letter, time)
    )
  },
  { seed: Number(process.env.SEED ?? 1) }
)
const percent = (rate: number) => `${Math.round(rate * 100)} %`.padStart(6)
for (const { name, expected, rate } of results) {
  console.log(`${percent(rate)}  ${expected === null ? 'none' : expected.padEnd(4)}  ${name}`)
}
const positives = results.filter(({ expected }) => expected !== null)
const negatives = results.filter(({ expected }) => expected === null)
const mean = (list: typeof results) => list.reduce((sum, { rate }) => sum + rate, 0) / list.length
console.log(`\nRecognised: ${percent(mean(positives))}   No false letter: ${percent(mean(negatives))}`)
