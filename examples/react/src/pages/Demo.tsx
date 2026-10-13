import { describeSign } from 'handsign-multilingual'
import { useCallback, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { usePageTitle } from '../pageTitle'
import { CameraView, type Frame } from '../components/CameraView'
import { FingerTable } from '../components/FingerTable'
import { Card, Notice, ScoreBar, Segmented, SignPicture } from '../components/ui'
import { SIGN_LANGUAGES } from '../languages'
import { type Recognition, samplesCanDecide } from '../recognition'
import { useSamples } from '../samples'
import { type Recognizer, type Text, useSettings, useT } from '../settings'

/** How long a letter has to stay steady to be written */
const HOLD_MS = 1000
/**
 * A letter with movement written this soon after its base letter replaces it: to make LL, the L is usually held (and
 * written) before moving
 */
const REPLACE_MS = 3000
const UI_EVERY_MS = 100

const SIDES: Record<string, Text> = {
  left: { en: 'Left hand', es: 'Mano izquierda' },
  right: { en: 'Right hand', es: 'Mano derecha' }
}

export default function Demo() {
  usePageTitle({ en: 'Live demo', es: 'Demo en directo' })
  const t = useT()
  const { settings, update, reset } = useSettings()
  const { classifier, counts, baseCount, hasBase } = useSamples()
  const language = SIGN_LANGUAGES[settings.signLanguage]
  const [searchParams, setSearchParams] = useSearchParams()

  const [frame, setFrame] = useState<Frame | null>(null)
  const lastUi = useRef(0)

  // Writing: a steady letter held for HOLD_MS is added to the text
  const [writing, setWriting] = useState(true)
  const [text, setText] = useState('')
  const [holding, setHolding] = useState<{ letter: string; progress: number } | null>(null)
  const hold = useRef<{ letter: string | null; since: number; written: boolean }>({ letter: null, since: 0, written: false })
  const lastWritten = useRef<{ letter: string; time: number } | null>(null)

  const onFrame = useCallback(
    (next: Frame) => {
      const now = performance.now()
      const first = next.recognitions[0]
      const letter = first ? next.stable[next.keys[0]] : null
      const motion = first ? next.motions[next.keys[0]] : null
      const current = hold.current
      if (writing && motion !== null) {
        // A letter with movement is written when it is made, in place of its base letter if that was just written
        const base = language.motions[motion]?.base
        const last = lastWritten.current
        const replace = base !== undefined && last?.letter === base && now - last.time < REPLACE_MS
        setText((previous) => (replace && previous.endsWith(base) ? previous.slice(0, -base.length) : previous) + motion)
        lastWritten.current = { letter: motion, time: now }
        hold.current = { letter: motion, since: now, written: true }
      } else if (letter !== current.letter) hold.current = { letter, since: now, written: false }
      else if (writing && letter !== null && !current.written && now - current.since >= HOLD_MS) {
        current.written = true
        lastWritten.current = { letter, time: now }
        setText((previous) => previous + letter)
      }
      if (now - lastUi.current >= UI_EVERY_MS) {
        lastUi.current = now
        setFrame(next)
        const { letter: held, since, written } = hold.current
        setHolding(writing && held !== null && !written ? { letter: held, progress: Math.min(1, (now - since) / HOLD_MS) } : null)
      }
    },
    [writing, language]
  )

  const recognitions = frame?.recognitions ?? []
  const first: Recognition | undefined = recognitions[0]
  // The letter to explain: the one chosen, or the best of the rules
  const target = searchParams.get('letter') ?? first?.rules[0]?.letter ?? language.alphabet[0]
  // A letter with movement: the handshape is its base letter
  const targetMotion = language.motions[target]
  const targetSign = language.descriptions[targetMotion?.base ?? target]
  const expected = useMemo(() => (targetSign ? describeSign(targetSign) : null), [targetSign])
  const usingSamples = settings.recognizer !== 'rules' && samplesCanDecide(classifier)
  // "My samples" chosen, but there are not enough: the rules decide (see recognize)
  const samplesMissing = settings.recognizer === 'samples' && !usingSamples
  const sampleCount = Object.values(counts).reduce((sum, count) => sum + count, 0)

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t({ en: 'Live demo', es: 'Demo en directo' })}</h1>
          <p className="text-slate-600 dark:text-slate-400">
            {t({
              en: `Sign a letter of the ${language.name.en} alphabet in front of the camera.`,
              es: `Haz una letra del alfabeto de la ${language.name.es.toLowerCase()} delante de la cámara.`
            })}
          </p>
        </div>
        <CameraView onFrame={onFrame} />

        <Card
          title={t({ en: 'Text', es: 'Texto' })}
          actions={
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={writing} onChange={(event) => setWriting(event.target.checked)} />
              {t({ en: 'Write the letters I hold', es: 'Escribir las letras que mantengo' })}
            </label>
          }
        >
          <p className="mb-2 text-sm text-slate-600 dark:text-slate-400">
            {t({
              en: 'Hold a letter for a second to write it. To repeat it, lower the hand or change letter in between.',
              es: 'Mantén una letra un segundo para escribirla. Para repetirla, baja la mano o cambia de letra entre medias.'
            })}
          </p>
          <output
            className="block min-h-14 break-all rounded-lg bg-slate-100 p-3 font-mono text-2xl tracking-widest dark:bg-slate-800"
            aria-live="polite"
            aria-label={t({ en: 'Text written', es: 'Texto escrito' })}
          >
            {text}
            {holding && (
              <span className="text-slate-400" aria-hidden="true">
                {holding.letter}
              </span>
            )}
            <span className="animate-pulse text-indigo-500" aria-hidden="true">
              |
            </span>
          </output>
          {holding && (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700" aria-hidden="true">
              <div className="h-full bg-indigo-500" style={{ width: `${holding.progress * 100}%` }} />
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn" onClick={() => setText((previous) => `${previous} `)}>
              {t({ en: 'Space', es: 'Espacio' })}
            </button>
            <button type="button" className="btn" onClick={() => setText((previous) => [...previous].slice(0, -1).join(''))}>
              {t({ en: 'Delete', es: 'Borrar' })}
            </button>
            <button type="button" className="btn" onClick={() => setText('')}>
              {t({ en: 'Clear', es: 'Vaciar' })}
            </button>
            <button type="button" className="btn" onClick={() => navigator.clipboard?.writeText(text)} disabled={text === ''}>
              {t({ en: 'Copy', es: 'Copiar' })}
            </button>
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <Card title={t({ en: 'Recognised', es: 'Reconocido' })}>
          {recognitions.length === 0 ? (
            <p className="text-slate-600 dark:text-slate-400">{t({ en: 'No hand in sight.', es: 'No se ve ninguna mano.' })}</p>
          ) : (
            <div className="flex flex-col gap-5">
              {recognitions.map((recognition, index) => (
                <HandResult
                  key={frame?.keys[index] ?? index}
                  recognition={recognition}
                  stable={frame?.stable[frame.keys[index]] ?? null}
                  moving={language.motions[frame?.stable[frame.keys[index]] ?? ''] !== undefined}
                />
              ))}
            </div>
          )}
          <p className="sr-only" aria-live="polite">
            {first && frame?.stable[frame.keys[0]]}
          </p>
        </Card>

        <Card title={t({ en: 'Why this letter?', es: '¿Por qué esta letra?' })}>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              {t({ en: 'Letter', es: 'Letra' })}
              <select
                className="field"
                value={searchParams.get('letter') ?? ''}
                onChange={(event) => setSearchParams(event.target.value ? { letter: event.target.value } : {}, { replace: true })}
              >
                <option value="">{t({ en: 'The best of the rules', es: 'La mejor de las reglas' })}</option>
                {language.alphabet.filter((letter) => language.descriptions[letter] || language.motions[letter]).map((letter) => (
                  <option key={letter} value={letter}>
                    {letter}
                  </option>
                ))}
              </select>
            </label>
            {first && (
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {t({ en: 'Rules score', es: 'Puntuación de las reglas' })}:{' '}
                <strong className="tabular-nums">{Math.round((first.rules.find(({ letter }) => letter === target)?.score ?? 0) * 100)}%</strong>
              </span>
            )}
          </div>
          <div className="flex gap-4">
            <SignPicture image={language.images[target]} />
            <div className="min-w-0 flex-1">
              {targetMotion && (
                <p className="mb-2 text-sm">
                  {t({
                    en: `${target}: the handshape of ${targetMotion.base}, ${targetMotion.movement.en}.`,
                    es: `${target}: la forma de la ${targetMotion.base}, ${targetMotion.movement.es}.`
                  })}
                </p>
              )}
              {expected ? (
                <FingerTable expected={expected} detected={first?.fingers ?? null} flip={first?.flipArrows ?? settings.mirror} />
              ) : (
                <p className="text-sm">{t({ en: 'The rules do not describe this letter.', es: 'Las reglas no describen esta letra.' })}</p>
              )}
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            {t({
              en: 'The arrows point as you see the hand on screen. Each ✗ is something to change in your hand, or a rule that does not fit how you sign: recording your own samples solves it.',
              es: 'Las flechas apuntan como ves la mano en pantalla. Cada ✗ es algo que cambiar en la mano, o una regla que no encaja con cómo signas: grabar tus propios ejemplos lo soluciona.'
            })}
          </p>
        </Card>

        <Card title={t({ en: 'Recognition', es: 'Reconocimiento' })}>
          <div className="flex flex-col gap-4">
            <Segmented<Recognizer>
              label={t({ en: 'Who decides the letter', es: 'Quién decide la letra' })}
              value={settings.recognizer}
              onChange={(recognizer) => update({ recognizer })}
              options={[
                { value: 'auto', label: t({ en: 'Automatic', es: 'Automático' }) },
                { value: 'rules', label: t({ en: 'Rules', es: 'Reglas' }) },
                { value: 'samples', label: t({ en: 'My samples', es: 'Mis ejemplos' }) }
              ]}
            />
            {samplesMissing && (
              <Notice tone="warning">
                {t({
                  en: `You chose "My samples", but there are no samples of ${language.id} for two letters at least: the rules decide meanwhile.`,
                  es: `Has elegido «Mis ejemplos», pero no hay ejemplos de ${language.id} de dos letras al menos: mientras, deciden las reglas.`
                })}{' '}
                <Link to="/train">{t({ en: 'Record samples', es: 'Grabar ejemplos' })}</Link>
              </Notice>
            )}
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {usingSamples && baseCount > 0
                ? t({
                    en: `Using the ready-made samples (${baseCount} hands of several people)${sampleCount > 0 ? ` and your ${sampleCount}` : ''}.`,
                    es: `Usando los ejemplos ya grabados (${baseCount} manos de varias personas)${sampleCount > 0 ? ` y tus ${sampleCount}` : ''}.`
                  })
                : usingSamples
                ? t({
                    en: `Using your ${sampleCount} samples of ${Object.keys(counts).length} letters.`,
                    es: `Usando tus ${sampleCount} ejemplos de ${Object.keys(counts).length} letras.`
                  })
                : t({
                    en: 'Using the rules of the library (fingerpose). ',
                    es: 'Usando las reglas de la librería (fingerpose). '
                  })}{' '}
              {!usingSamples && (
                <Link to="/train">
                  {t({ en: 'Record your samples to recognise better', es: 'Graba tus ejemplos para reconocer mejor' })}
                </Link>
              )}
            </p>
            {hasBase && (
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-1" checked={settings.baseSamples} onChange={(event) => update({ baseSamples: event.target.checked })} />
                <span>
                  {t({
                    en: 'Use also the ready-made samples: 2122 hands of several people (the ASLNow! dataset). Without them, only the rules or your samples.',
                    es: 'Usar también los ejemplos ya grabados: 2122 manos de varias personas (el conjunto ASLNow!). Sin ellos, solo las reglas o tus ejemplos.'
                  })}
                </span>
              </label>
            )}
            <label className="flex flex-col gap-1 text-sm">
              <span>
                {t({ en: 'Minimum score of the rules', es: 'Puntuación mínima de las reglas' })}:{' '}
                <strong className="tabular-nums">{Math.round(settings.minScore * 100)}%</strong>
              </span>
              <input type="range" min={0.5} max={1} step={0.01} value={settings.minScore} onChange={(event) => update({ minScore: Number(event.target.value) })} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span>
                {t({ en: 'Minimum agreement of your samples', es: 'Acuerdo mínimo de tus ejemplos' })}:{' '}
                <strong className="tabular-nums">{Math.round(settings.minShare * 100)}%</strong>
              </span>
              <input type="range" min={0.3} max={1} step={0.05} value={settings.minShare} onChange={(event) => update({ minShare: Number(event.target.value) })} />
            </label>
            <div className="flex flex-wrap gap-4">
              <Segmented
                label={t({ en: 'Hand model', es: 'Modelo de manos' })}
                value={settings.modelType}
                onChange={(modelType) => update({ modelType })}
                options={[
                  { value: 'full', label: t({ en: 'Full (more precise)', es: 'Completo (más preciso)' }) },
                  { value: 'lite', label: t({ en: 'Lite (faster)', es: 'Ligero (más rápido)' }) }
                ]}
              />
              <Segmented
                label={t({ en: 'Hands', es: 'Manos' })}
                value={String(settings.maxHands) as '1' | '2'}
                onChange={(value) => update({ maxHands: value === '1' ? 1 : 2 })}
                options={[
                  { value: '1', label: '1' },
                  { value: '2', label: '2' }
                ]}
              />
            </div>
            <button type="button" className="btn self-start" onClick={reset}>
              {t({ en: 'Reset the settings', es: 'Restablecer los ajustes' })}
            </button>
          </div>
        </Card>

        <Card title={t({ en: 'Tips', es: 'Consejos' })}>
          <ul className="list-disc space-y-1 ps-5 text-sm">
            <li>{t({ en: 'Palm facing the camera, the whole hand in the picture and the wrist visible.', es: 'La palma hacia la cámara, la mano entera en la imagen y la muñeca visible.' })}</li>
            <li>{t({ en: 'Good light from the front, and a plain background.', es: 'Buena luz de frente y un fondo liso.' })}</li>
            <li>{t({ en: 'Keep the hand still for a moment: the letter steadies after a few frames.', es: 'Deja la mano quieta un momento: la letra se estabiliza tras unos fotogramas.' })}</li>
            <li>{t({ en: 'Both hands work: the left one is recognised as the mirror of the right.', es: 'Valen las dos manos: la izquierda se reconoce como el reflejo de la derecha.' })}</li>
            {Object.keys(language.motions).length > 0 && (
              <li>
                {t({
                  en: `${Object.keys(language.motions).join(', ')}: make the base letter and move the hand clearly, about the length of your palm; the yellow trail shows the movement.`,
                  es: `${Object.keys(language.motions).join(', ')}: haz la letra base y mueve la mano con claridad, más o menos lo que mide tu palma; el rastro amarillo muestra el movimiento.`
                })}
              </li>
            )}
            <li>
              {t({
                en: 'J and Z are only recognised by a position of the hand, without their movement.',
                es: 'La J y la Z solo se reconocen por una posición de la mano, sin su movimiento.'
              })}
            </li>
          </ul>
        </Card>

        <details className="card">
          <summary className="cursor-pointer font-semibold">{t({ en: 'Data for debugging', es: 'Datos para depurar' })}</summary>
          <div className="mt-3 flex flex-col gap-2 text-sm">
            <p>
              {t({ en: 'Frames per second', es: 'Fotogramas por segundo' })}: <strong>{frame?.fps.toFixed(1) ?? '—'}</strong>
            </p>
            <button
              type="button"
              className="btn self-start"
              disabled={!first}
              onClick={() => navigator.clipboard?.writeText(JSON.stringify(first?.hand, null, 2))}
            >
              {t({ en: 'Copy the points of the hand (JSON)', es: 'Copiar los puntos de la mano (JSON)' })}
            </button>
            <pre className="max-h-48 overflow-auto rounded bg-slate-100 p-2 text-xs dark:bg-slate-800">
              {first ? first.fingers.map(({ finger, curl, direction }) => `${finger}: ${curl}, ${direction}`).join('\n') : '—'}
            </pre>
          </div>
        </details>
      </div>
    </div>
  )
}

function HandResult({ recognition, stable, moving }: { recognition: Recognition; stable: string | null; moving: boolean }) {
  const t = useT()
  const candidates = recognition.source === 'samples' ? recognition.samples : recognition.rules
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
          {recognition.side ? t(SIDES[recognition.side]) : t({ en: 'Hand', es: 'Mano' })}
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {moving
            ? t({ en: 'with movement', es: 'con movimiento' })
            : recognition.source === 'samples'
              ? t({ en: 'by the samples', es: 'por los ejemplos' })
              : t({ en: 'by the rules', es: 'por las reglas' })}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <span
          className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-xl text-5xl font-bold ${
            stable ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
          }`}
        >
          {stable ?? '—'}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          {candidates.slice(0, 3).map(({ letter, score }) => (
            <ScoreBar key={letter} label={letter} score={score} highlight={letter === recognition.letter} />
          ))}
        </div>
      </div>
      {recognition.letter === null && candidates[0] && (
        <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
          {t({
            en: `No letter reaches ${Math.round(recognition.threshold * 100)}%: the best is ${candidates[0].letter} (${Math.round(candidates[0].score * 100)}%). Look at "Why this letter?", lower the minimum or record your samples.`,
            es: `Ninguna letra llega al ${Math.round(recognition.threshold * 100)} %: la mejor es la ${candidates[0].letter} (${Math.round(candidates[0].score * 100)} %). Mira «¿Por qué esta letra?», baja el mínimo o graba tus ejemplos.`
          })}
        </p>
      )}
    </div>
  )
}
