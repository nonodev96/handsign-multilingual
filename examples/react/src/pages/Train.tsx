import { describeSign } from 'handsign-multilingual'
import type { CrossValidation } from 'handsign-multilingual'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePageTitle } from '../pageTitle'
import { CameraView, type Frame } from '../components/CameraView'
import { FingerTable } from '../components/FingerTable'
import { Card, Notice, SignPicture } from '../components/ui'
import { SIGN_LANGUAGES } from '../languages'
import { useSamples } from '../samples'
import { useSettings, useT } from '../settings'

const SAMPLES_PER_RECORDING = 20
const COUNTDOWN_S = 3
/** Between two samples, so they are a bit different from each other */
const SAMPLE_EVERY_MS = 90
const ENOUGH = 40

type Recording = { phase: 'idle' } | { phase: 'countdown'; seconds: number } | { phase: 'recording'; taken: number; oneHand: boolean }

export default function Train() {
  usePageTitle({ en: 'Train', es: 'Entrenar' })
  const t = useT()
  const { settings, update } = useSettings()
  const { counts, add, clear, own, exportJSON, importJSON, recorded, record, exportRecordings } = useSamples()
  const language = SIGN_LANGUAGES[settings.signLanguage]
  // The letters with movement are not recorded: they are recognised by moving their base letter
  const letters = language.alphabet.filter((letter) => language.notRecognised[letter] === undefined && language.motions[letter] === undefined)
  const motionLetters = Object.entries(language.motions)
  const [letter, setLetter] = useState(letters[0])
  const [recording, setRecording] = useState<Recording>({ phase: 'idle' })
  const [evaluation, setEvaluation] = useState<CrossValidation | null>(null)
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)
  // For each frame (the callback does not wait for React to render): the samples taken so far in this recording
  const state = useRef({ recording, letter, letters, autoNext: settings.autoNext, lastSample: 0, taken: 0 })
  state.current.recording = recording
  state.current.letter = letter
  state.current.letters = letters
  state.current.autoNext = settings.autoNext
  const [saved, setSaved] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)

  // A different language: its first letter, and the evaluation no longer applies
  useEffect(() => {
    setLetter(letters[0])
    setEvaluation(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.signLanguage])

  // The countdown, a second at a time
  useEffect(() => {
    if (recording.phase !== 'countdown') return
    const timer = setTimeout(() => {
      if (recording.seconds <= 1) state.current.taken = 0
      setRecording(recording.seconds > 1 ? { phase: 'countdown', seconds: recording.seconds - 1 } : { phase: 'recording', taken: 0, oneHand: true })
    }, 1000)
    return () => clearTimeout(timer)
  }, [recording])

  const onFrame = useCallback(
    (frame: Frame) => {
      const current = state.current
      if (current.recording.phase !== 'recording') return
      const now = performance.now()
      if (now - current.lastSample < SAMPLE_EVERY_MS) return
      // Only with one hand in sight: with two, it is not clear which one is signing
      const oneHand = frame.recognitions.length === 1
      if (oneHand && current.taken < SAMPLES_PER_RECORDING) {
        current.lastSample = now
        current.taken++
        add(current.letter, [frame.recognitions[0].hand])
        // Also its points, to measure the recognition with real hands (pnpm evaluate)
        record(current.letter, frame.recognitions[0].hand, frame.size)
      }
      const taken = current.taken
      if (taken < SAMPLES_PER_RECORDING) {
        setRecording({ phase: 'recording', taken, oneHand })
        return
      }
      // Done: the next letter, if recording one after the other. Also in the ref at once: the next frame comes before
      // React renders again
      setEvaluation(null)
      const next = current.autoNext ? current.letters[current.letters.indexOf(current.letter) + 1] : undefined
      const after: Recording = next === undefined ? { phase: 'idle' } : { phase: 'countdown', seconds: COUNTDOWN_S }
      current.recording = after
      if (next !== undefined) {
        current.letter = next
        setLetter(next)
      }
      setRecording(after)
    },
    [add, record]
  )

  const nextLetter = () => setLetter(letters[(letters.indexOf(letter) + 1) % letters.length])
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0)
  const sign = language.descriptions[letter]
  const expected = useMemo(() => (sign ? describeSign(sign) : null), [sign])

  const save = (json: string, name: string) => {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = name
    link.click()
    URL.revokeObjectURL(url)
  }
  const download = () => save(exportJSON(), `handsign-samples-${language.id}.json`)

  // Only with the development server (vite.config.ts): the recordings go to packages/handsign-multilingual/data
  const saveToRepository = async () => {
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}__handsign/recordings`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: exportRecordings()
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)
      setSaved({ tone: 'success', text: t({ en: `${result.samples} hands saved in ${result.file}`, es: `${result.samples} manos guardadas en ${result.file}` }) })
    } catch (error) {
      setSaved({ tone: 'error', text: t({ en: `They could not be saved (${error})`, es: `No se han podido guardar (${error})` }) })
    }
  }

  const upload = async (file: File | undefined) => {
    if (!file) return
    try {
      const id = importJSON(await file.text())
      setMessage({ tone: 'success', text: t({ en: `Samples of ${id} loaded.`, es: `Ejemplos de ${id} cargados.` }) })
    } catch {
      setMessage({ tone: 'error', text: t({ en: 'That file is not a samples file.', es: 'Ese archivo no es de ejemplos.' }) })
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  const confusions = evaluation
    ? Object.entries(evaluation.confusion)
        .flatMap(([expectedLetter, row]) =>
          Object.entries(row)
            .filter(([recognised]) => recognised !== expectedLetter)
            .map(([recognised, count]) => ({ expectedLetter, recognised, count }))
        )
        .sort((a, b) => b.count - a.count)
        .slice(0, 6)
    : []

  const overlay =
    recording.phase === 'countdown' ? (
      <div className="absolute inset-0 flex items-center justify-center bg-slate-900/40" role="status">
        <span className="text-8xl font-bold text-white drop-shadow-sm">{recording.seconds}</span>
      </div>
    ) : recording.phase === 'recording' ? (
      <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-red-600 px-3 py-1 text-sm font-semibold text-white" role="status">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-white" aria-hidden="true" />
        {t({ en: 'Recording', es: 'Grabando' })} {letter}: {recording.taken}/{SAMPLES_PER_RECORDING}
        {!recording.oneHand && ` (${t({ en: 'show only one hand', es: 'enseña solo una mano' })})`}
      </div>
    ) : undefined

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t({ en: 'Train with your hand', es: 'Entrena con tu mano' })}</h1>
          <p className="text-slate-600 dark:text-slate-400">
            {t({
              en: 'Record a few samples of each letter: the demo then recognises the letters by comparing your hand with them, instead of with fixed rules. It works much better, also with letters the rules confuse.',
              es: 'Graba unos ejemplos de cada letra: la demo reconocerá entonces las letras comparando tu mano con ellos, en vez de con reglas fijas. Funciona mucho mejor, también con letras que las reglas confunden.'
            })}
          </p>
        </div>
        <CameraView onFrame={onFrame} overlay={overlay} />
        <Card title={t({ en: 'How to record', es: 'Cómo grabar' })}>
          <ol className="list-decimal space-y-1 ps-5 text-sm">
            <li>
              {t({
                en: 'Choose the first letter and, if you like, write your name: it is saved with each hand.',
                es: 'Elige la primera letra y, si quieres, escribe tu nombre: se guarda con cada mano.'
              })}
            </li>
            <li>
              {t({
                en: `Press "Record" and make the letter: after ${COUNTDOWN_S} seconds, ${SAMPLES_PER_RECORDING} samples are taken in about two seconds. Recording one after the other, the next letter comes by itself.`,
                es: `Pulsa «Grabar» y haz la letra: tras ${COUNTDOWN_S} segundos se toman ${SAMPLES_PER_RECORDING} ejemplos en unos dos segundos. Grabando seguido, la siguiente letra llega sola.`
              })}
            </li>
            <li>
              {t({
                en: 'Move the hand a little while recording (closer, further, slightly turned): varied samples recognise better.',
                es: 'Mueve un poco la mano mientras se graba (más cerca, más lejos, algo girada): con ejemplos variados se reconoce mejor.'
              })}
            </li>
            <li>
              {t({
                en: 'Go through the alphabet two or three times, better at different moments or with different light, and check it in "Evaluate".',
                es: 'Recorre el alfabeto dos o tres veces, mejor en momentos o con luz distintos, y compruébalo en «Evaluar».'
              })}
            </li>
            <li>
              {t({
                en: 'Save the points in "Measure with your hands", so that they can become ready-made samples of the library.',
                es: 'Guarda los puntos en «Medir con tus manos», para que puedan ser ejemplos ya grabados de la librería.'
              })}
            </li>
          </ol>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <Card title={`${t({ en: 'Letter', es: 'Letra' })} ${letter}`}>
          <div className="flex gap-4">
            <SignPicture image={language.images[letter]} size="lg" />
            <div className="flex flex-1 flex-col gap-2">
              <p className="text-sm">
                {t({ en: 'Samples', es: 'Ejemplos' })}: <strong className="tabular-nums">{counts[letter] ?? 0}</strong>
              </p>
              <button
                type="button"
                className="btn btn-primary"
                disabled={recording.phase !== 'idle'}
                onClick={() => setRecording({ phase: 'countdown', seconds: COUNTDOWN_S })}
              >
                {t({ en: 'Record', es: 'Grabar' })} {SAMPLES_PER_RECORDING}
              </button>
              {recording.phase !== 'idle' && (
                <button type="button" className="btn" onClick={() => setRecording({ phase: 'idle' })}>
                  {t({ en: 'Stop', es: 'Parar' })}
                </button>
              )}
              <button type="button" className="btn" onClick={nextLetter} disabled={recording.phase !== 'idle'}>
                {t({ en: 'Next letter', es: 'Siguiente letra' })}
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={!counts[letter] || recording.phase !== 'idle'}
                onClick={() => {
                  clear(letter)
                  setEvaluation(null)
                }}
              >
                {t({ en: 'Delete its samples', es: 'Borrar sus ejemplos' })}
              </button>
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-2 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={settings.autoNext} onChange={(event) => update({ autoNext: event.target.checked })} />
              {t({
                en: 'When a letter is done, go on recording the next one',
                es: 'Al terminar una letra, seguir grabando la siguiente'
              })}
            </label>
            <label className="flex flex-wrap items-center gap-2">
              {t({ en: 'Who records (optional)', es: 'Quién graba (opcional)' })}
              <input
                className="field w-40"
                value={settings.recorder}
                onChange={(event) => update({ recorder: event.target.value })}
                placeholder={t({ en: 'a name or an alias', es: 'un nombre o alias' })}
              />
            </label>
          </div>
          {language.id === 'SSL' && (
            <div className="mt-3">
              <Notice tone="warning">
                {t({
                  en: 'Make the letter as in Spanish Sign Language: the picture is still the American one, and some letters differ. ',
                  es: 'Haz la letra como en la lengua de signos española: el dibujo es aún el americano, y algunas letras no coinciden. '
                })}
                <a href="https://raw.githubusercontent.com/nonodev96/handsign-multilingual/main/.github/SSL.png" target="_blank" rel="noreferrer">
                  {t({ en: 'The Spanish alphabet', es: 'El alfabeto español' })}
                </a>
              </Notice>
            </div>
          )}
          {expected && (
            <details className="mt-3">
              <summary className="cursor-pointer text-sm font-medium">{t({ en: 'What the rules expect', es: 'Qué esperan las reglas' })}</summary>
              <div className="mt-2">
                <FingerTable expected={expected} detected={null} flip={settings.mirror} />
              </div>
            </details>
          )}
        </Card>

        <Card title={t({ en: 'Letters', es: 'Letras' })}>
          <ul className="grid grid-cols-6 gap-1.5 sm:grid-cols-9 lg:grid-cols-6 xl:grid-cols-7">
            {letters.map((item) => {
              const count = counts[item] ?? 0
              return (
                <li key={item}>
                  <button
                    type="button"
                    aria-pressed={item === letter}
                    onClick={() => setLetter(item)}
                    disabled={recording.phase !== 'idle'}
                    className={`flex w-full flex-col items-center rounded-lg border py-1 text-lg font-bold ${
                      item === letter ? 'border-indigo-500 ring-2 ring-indigo-500' : 'border-slate-200 dark:border-slate-700'
                    } ${count >= ENOUGH ? 'bg-emerald-50 dark:bg-emerald-950' : count > 0 ? 'bg-amber-50 dark:bg-amber-950' : 'bg-white dark:bg-slate-900'}`}
                  >
                    {item}
                    <span className="text-xs font-normal tabular-nums text-slate-500 dark:text-slate-400">{count}</span>
                  </button>
                </li>
              )
            })}
          </ul>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {t({
              en: `Green: ${ENOUGH} samples or more. Amber: fewer. ${total} samples in total, saved in this browser.`,
              es: `Verde: ${ENOUGH} ejemplos o más. Ámbar: menos. ${total} ejemplos en total, guardados en este navegador.`
            })}
          </p>
          {motionLetters.length > 0 && (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {t({
                en: `${motionLetters.map(([letter]) => letter).join(', ')} are not recorded: they are recognised by the movement, from your samples of ${motionLetters.map(([, { base }]) => base).join(', ')}.`,
                es: `${motionLetters.map(([letter]) => letter).join(', ')} no se graban: se reconocen por el movimiento, a partir de tus ejemplos de ${motionLetters.map(([, { base }]) => base).join(', ')}.`
              })}
            </p>
          )}
        </Card>

        <Card title={t({ en: 'Evaluate', es: 'Evaluar' })}>
          <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">
            {t({
              en: 'Each sample is recognised from all the others: it shows how well your samples tell the letters apart.',
              es: 'Cada ejemplo se reconoce a partir de todos los demás: muestra lo bien que tus ejemplos distinguen las letras.'
            })}
          </p>
          <button type="button" className="btn" disabled={own.size < 2} onClick={() => setEvaluation(own.crossValidate())}>
            {t({ en: 'Evaluate my samples', es: 'Evaluar mis ejemplos' })}
          </button>
          {evaluation && (
            <div className="mt-3 text-sm">
              <p>
                {t({ en: 'Correct', es: 'Aciertos' })}: <strong className="text-lg tabular-nums">{Math.round(evaluation.accuracy * 100)}%</strong>{' '}
                ({evaluation.total} {t({ en: 'samples', es: 'ejemplos' })})
              </p>
              {confusions.length > 0 && (
                <>
                  <p className="mt-2 font-medium">{t({ en: 'Most confused', es: 'Lo que más se confunde' })}:</p>
                  <ul className="mt-1 space-y-0.5">
                    {confusions.map(({ expectedLetter, recognised, count }) => (
                      <li key={`${expectedLetter}-${recognised}`}>
                        {expectedLetter} → {recognised}: {count}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    {t({
                      en: 'Record more varied samples of those letters, making the difference between them clear.',
                      es: 'Graba más ejemplos variados de esas letras, marcando bien la diferencia entre ellas.'
                    })}
                  </p>
                </>
              )}
            </div>
          )}
        </Card>

        <Card title={t({ en: 'Measure with your hands', es: 'Medir con tus manos' })}>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t({
              en: `Recording also keeps the points of each hand (${recorded} so far). Download them to measure how well the library recognises ${language.id} with real hands (pnpm evaluate), or to share them and improve it: there are no public data of the Spanish alphabet.`,
              es: `Al grabar también se guardan los puntos de cada mano (${recorded} hasta ahora). Descárgalos para medir lo bien que la librería reconoce la ${language.id} con manos reales (pnpm evaluate), o para compartirlos y mejorarla: no hay datos públicos del alfabeto español.`
            })}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {import.meta.env.DEV && (
              <button type="button" className="btn btn-primary" disabled={recorded === 0} onClick={saveToRepository}>
                {t({ en: 'Save them in the repository', es: 'Guardarlos en el repositorio' })}
              </button>
            )}
            <button
              type="button"
              className="btn"
              disabled={recorded === 0}
              onClick={() => save(exportRecordings(), `handsign-dataset-${language.id}-${new Date().toISOString().slice(0, 10)}.json`)}
            >
              {t({ en: 'Download the points (JSON)', es: 'Descargar los puntos (JSON)' })}
            </button>
          </div>
          {saved && (
            <div className="mt-2">
              <Notice tone={saved.tone}>{saved.text}</Notice>
            </div>
          )}
        </Card>

        <Card title={t({ en: 'Your samples', es: 'Tus ejemplos' })}>
          {message && <Notice tone={message.tone}>{message.text}</Notice>}
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className="btn" disabled={total === 0} onClick={download}>
              {t({ en: 'Download (JSON)', es: 'Descargar (JSON)' })}
            </button>
            <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
              {t({ en: 'Load a file', es: 'Cargar un archivo' })}
            </button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(event) => upload(event.target.files?.[0])} />
            <button
              type="button"
              className="btn btn-danger"
              disabled={total === 0}
              onClick={() => {
                if (window.confirm(t({ en: `Delete all the ${language.id} samples?`, es: `¿Borrar todos los ejemplos de ${language.id}?` }))) {
                  clear()
                  setEvaluation(null)
                }
              }}
            >
              {t({ en: 'Delete all', es: 'Borrar todos' })}
            </button>
          </div>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            {t({
              en: 'The file works with HandSignClassifier.fromJSON in your own app. ',
              es: 'El archivo sirve para HandSignClassifier.fromJSON en tu propia aplicación. '
            })}
            <Link to="/demo">{t({ en: 'Try your samples in the live demo', es: 'Prueba tus ejemplos en la demo en directo' })}</Link>.
          </p>
        </Card>
      </div>
    </div>
  )
}
