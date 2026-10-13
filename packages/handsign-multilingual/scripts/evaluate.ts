// How well the letters are recognised with real hands: the rules and the samples (HandSignClassifier), with the
// datasets of data/ (or the files given, as the demo exports them).
//
//   pnpm evaluate [dataset.json…]
import {
  type Dataset,
  type Report,
  evaluateRules,
  evaluateSamples,
  loadDataset,
  mergeDatasets
} from '../tests/evaluation'

const percent = (value: number) => `${(value * 100).toFixed(1)} %`

const files = process.argv.slice(2)
const paths =
  files.length > 0
    ? files
    : [new URL('../data/asl-now.json', import.meta.url).pathname]

function letters(title: string, { letters }: Report) {
  const rows = Object.entries(letters).sort(([a], [b]) =>
    a.localeCompare(b, 'es')
  )
  console.log(`\n${title}`)
  console.log(
    rows
      .map(
        ([letter, { total, correct }]) =>
          `${letter} ${Math.round((correct / total) * 100)}%`
      )
      .join('  ')
  )
}

function confusions(report: Report) {
  console.log(
    `Most confused: ${report.confusions
      .slice(0, 10)
      .map(
        ({ expected, recognised, count }) =>
          `${expected}→${recognised} ${count}`
      )
      .join(', ')}`
  )
}

function evaluate(dataset: Dataset) {
  const people = new Set(
    dataset.samples
      .map(({ person }) => person)
      .filter((person) => person !== undefined)
  )
  console.log(
    `\n# ${dataset.source} (${dataset.language}, ${dataset.samples.length} samples${people.size ? `, ${people.size} ${people.size === 1 ? 'person' : 'people'}` : ''})`
  )

  const rules = evaluateRules(dataset)
  console.log(
    `\nRules: the best letter is right in ${percent(rules.top.accuracy)} of the samples`
  )
  console.log(
    `With the minimum of 80 %: ${percent(rules.coverage)} of the samples reach it, and ${percent(rules.confident.accuracy)} of those are right`
  )
  letters('Rules, by letter (best letter right):', rules.top)
  confusions(rules.top)

  const fresh = evaluateSamples(dataset, { groupDistance: 0 })
  const grouped = evaluateSamples(dataset, { groupDistance: 0.3 })
  if (people.size >= 2) {
    console.log(
      `\nSamples (k nearest neighbours), each person from the samples of the others: ${percent(grouped.accuracy)}`
    )
  } else {
    console.log(
      `\nSamples (k nearest neighbours, 5 folds): ${percent(fresh.accuracy)}`
    )
    console.log(
      `Keeping the takes of the same moment together: ${percent(grouped.accuracy)}`
    )
  }
  letters('Samples, by letter:', grouped)
  confusions(grouped)
}

const datasets = paths.map((path) => loadDataset(path))
for (const dataset of datasets) evaluate(dataset)
// Several files of the same language (the recordings of several people): also all together
for (const language of new Set(datasets.map(({ language }) => language))) {
  const same = datasets.filter((dataset) => dataset.language === language)
  if (same.length >= 2) evaluate(mergeDatasets(same))
}
