import { describeSign } from 'handsign-multilingual'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePageTitle } from '../pageTitle'
import { CameraView, type Frame } from '../components/CameraView'
import { FingerTable } from '../components/FingerTable'
import { Card, Segmented, SignPicture } from '../components/ui'
import { SIGN_LANGUAGES, type SignLanguage, lettersOf } from '../languages'
import { useSettings, useT } from '../settings'

/** How long the right letter has to be held */
const HOLD_MS = 700

type Mode = 'words' | 'letters'

const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)]

const newTarget = (language: SignLanguage, mode: Mode) => {
  if (mode === 'words') return pick(language.words)
  const letters = [...Object.keys(language.descriptions), ...Object.keys(language.motions)]
  return Array.from({ length: 5 }, () => pick(letters)).join(' ')
}

export default function Practice() {
  usePageTitle({ en: 'Practise', es: 'Practicar' })
  const t = useT()
  const { settings } = useSettings()
  const language = SIGN_LANGUAGES[settings.signLanguage]
  const [mode, setMode] = useState<Mode>('words')
  const [target, setTarget] = useState(() => newTarget(language, 'words'))
  const [position, setPosition] = useState(0)
  const [skipped, setSkipped] = useState(0)
  const [started, setStarted] = useState(() => Date.now())
  const [finished, setFinished] = useState<number | null>(null)
  const [progress, setProgress] = useState(0)
  const [help, setHelp] = useState(false)
  const [seen, setSeen] = useState<Frame | null>(null)
  const letters = lettersOf(target, language)
  const letter = letters[position]
  const state = useRef({ letter, since: 0, done: false })
  state.current.letter = letter

  const restart = useCallback(
    (nextMode = mode) => {
      setTarget(newTarget(language, nextMode))
      setPosition(0)
      setSkipped(0)
      setStarted(Date.now())
      setFinished(null)
      setProgress(0)
    },
    [language, mode]
  )

  // Another sign language: another word
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => restart(), [settings.signLanguage])

  const advance = useCallback(() => {
    state.current.since = 0
    setProgress(0)
    setPosition((previous) => {
      const next = previous + 1
      const total = lettersOf(target, language).length
      if (next >= total) setFinished(Date.now())
      return Math.min(next, total)
    })
  }, [target, language])

  const onFrame = useCallback(
    (frame: Frame) => {
      setSeen(frame)
      const current = state.current
      if (finished !== null || current.letter === undefined) return
      const now = performance.now()
      // A letter with movement counts when it is made
      if (frame.keys.some((key) => frame.motions[key] === current.letter)) {
        advance()
        return
      }
      const right = frame.keys.some((key) => frame.stable[key] === current.letter)
      if (!right) {
        current.since = 0
        setProgress(0)
        return
      }
      if (current.since === 0) current.since = now
      const held = (now - current.since) / HOLD_MS
      setProgress(Math.min(1, held))
      if (held >= 1) advance()
    },
    [advance, finished]
  )

  const motion = letter ? language.motions[letter] : undefined
  const sign = letter ? language.descriptions[motion?.base ?? letter] : undefined
  const expected = useMemo(() => (sign ? describeSign(sign) : null), [sign])
  const first = seen?.recognitions[0]
  const seconds = finished !== null ? Math.round((finished - started) / 1000) : null

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t({ en: 'Practise fingerspelling', es: 'Practica el deletreo' })}</h1>
          <p className="text-slate-600 dark:text-slate-400">
            {t({
              en: 'Sign each letter and hold it a moment: when it is recognised, the next one comes.',
              es: 'Haz cada letra y mantenla un momento: cuando se reconoce, pasa a la siguiente.'
            })}
          </p>
        </div>
        <CameraView onFrame={onFrame} />
      </div>

      <div className="flex flex-col gap-4">
        <Card>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <Segmented<Mode>
              label={t({ en: 'Practise with', es: 'Practicar con' })}
              value={mode}
              onChange={(next) => {
                setMode(next)
                restart(next)
              }}
              options={[
                { value: 'words', label: t({ en: 'Words', es: 'Palabras' }) },
                { value: 'letters', label: t({ en: 'Random letters', es: 'Letras al azar' }) }
              ]}
            />
            <button type="button" className="btn" onClick={() => restart()}>
              {t({ en: 'Another one', es: 'Otra' })}
            </button>
          </div>

          <p className="mt-5 flex flex-wrap justify-center gap-1 font-mono text-4xl font-bold tracking-widest" aria-label={target}>
            {letters.map((item, index) => (
              <span
                key={`${item}-${index}`}
                className={
                  index < position
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : index === position
                      ? 'rounded-sm bg-indigo-100 px-1 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200'
                      : 'text-slate-400'
                }
              >
                {item}
              </span>
            ))}
          </p>

          {finished !== null ? (
            <div className="mt-5 text-center" role="status">
              <p className="text-xl font-semibold">{t({ en: 'Done!', es: '¡Hecho!' })}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {t({ en: `${seconds} seconds, ${skipped} skipped.`, es: `${seconds} segundos, ${skipped} saltadas.` })}
              </p>
              <button type="button" className="btn btn-primary mt-3" onClick={() => restart()}>
                {t({ en: 'Again', es: 'Otra vez' })}
              </button>
            </div>
          ) : (
            letter && (
              <div className="mt-5 flex items-center gap-4">
                <SignPicture image={language.images[letter]} size="lg" />
                <div className="flex flex-1 flex-col gap-3">
                  <p>
                    {t({ en: 'Sign', es: 'Haz la' })} <strong className="text-3xl">{letter}</strong>
                  </p>
                  <div
                    className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
                    role="progressbar"
                    aria-label={t({ en: 'Holding the letter', es: 'Manteniendo la letra' })}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(progress * 100)}
                  >
                    <div className="h-full bg-emerald-500 transition-[width]" style={{ width: `${progress * 100}%` }} />
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {t({ en: 'Seen', es: 'Se ve' })}: <strong>{first && seen ? (seen.stable[seen.keys[0]] ?? '—') : '—'}</strong>
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn"
                      onClick={() => {
                        setSkipped((previous) => previous + 1)
                        advance()
                      }}
                    >
                      {t({ en: 'Skip', es: 'Saltar' })}
                    </button>
                    <button type="button" className="btn" aria-expanded={help} onClick={() => setHelp((previous) => !previous)}>
                      {t({ en: 'Help', es: 'Ayuda' })}
                    </button>
                  </div>
                </div>
              </div>
            )
          )}
        </Card>

        {help && expected && finished === null && (
          <Card title={t({ en: `How to make ${letter}`, es: `Cómo se hace la ${letter}` })}>
            {motion && (
              <p className="mb-2 text-sm">
                {t({
                  en: `The handshape of ${motion.base}, ${motion.movement.en}.`,
                  es: `La forma de la ${motion.base}, ${motion.movement.es}.`
                })}
              </p>
            )}
            <FingerTable expected={expected} detected={first?.fingers ?? null} flip={first?.flipArrows ?? settings.mirror} />
          </Card>
        )}
      </div>
    </div>
  )
}
