import { describeSign } from 'handsign-multilingual'
import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { usePageTitle } from '../pageTitle'
import { FingerTable } from '../components/FingerTable'
import { Card, Notice, SignPicture } from '../components/ui'
import { SIGN_LANGUAGES } from '../languages'
import { useSamples } from '../samples'
import { useSettings, useT } from '../settings'

export default function Alphabet() {
  usePageTitle({ en: 'Alphabet', es: 'Alfabeto' })
  const t = useT()
  const { settings } = useSettings()
  const { counts } = useSamples()
  const language = SIGN_LANGUAGES[settings.signLanguage]
  const [searchParams, setSearchParams] = useSearchParams()
  const selected = searchParams.get('letter') ?? language.alphabet[0]
  const letter = language.alphabet.includes(selected) ? selected : language.alphabet[0]
  // A letter with movement: the handshape is its base letter
  const motion = language.motions[letter]
  const sign = language.descriptions[motion?.base ?? letter]
  const expected = useMemo(() => (sign ? describeSign(sign) : null), [sign])
  const recognised = language.alphabet.length - Object.keys(language.notRecognised).length

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">
          {t({ en: 'Alphabet', es: 'Alfabeto' })}: {t(language.name)}
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          {t({
            en: `${language.alphabet.length} letters, ${recognised} of them recognised. Choose one to see what each finger does.`,
            es: `${language.alphabet.length} letras, ${recognised} de ellas reconocidas. Elige una para ver qué hace cada dedo.`
          })}
        </p>
      </div>

      {language.id === 'SSL' && (
        <Notice tone="warning">
          {t({
            en: 'Most Spanish letters still use the description and the picture of the American letter: some may not match the Spanish fingerspelling alphabet yet. Recording your own samples avoids it.',
            es: 'La mayoría de las letras españolas usan aún la descripción y el dibujo de la letra americana: puede que alguna no coincida todavía con el alfabeto dactilológico español. Grabar tus propios ejemplos lo evita.'
          })}
        </Notice>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {language.alphabet.map((item) => {
            const reason = language.notRecognised[item]
            return (
              <li key={item}>
                <button
                  type="button"
                  aria-pressed={item === letter}
                  onClick={() => setSearchParams({ letter: item }, { replace: true })}
                  className={`flex w-full flex-col items-center gap-2 rounded-xl border bg-white p-3 text-left dark:bg-slate-900 ${
                    item === letter ? 'border-indigo-500 ring-2 ring-indigo-500' : 'border-slate-200 hover:border-indigo-300 dark:border-slate-800'
                  }`}
                >
                  <SignPicture image={language.images[item]} />
                  <span className="text-2xl font-bold">{item}</span>
                  <span className="flex flex-wrap justify-center gap-1 text-xs">
                    {language.motions[item] && (
                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-indigo-900 dark:bg-indigo-900 dark:text-indigo-100">
                        {t({ en: 'with movement', es: 'con movimiento' })}
                      </span>
                    )}
                    {reason ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-900 dark:bg-amber-900 dark:text-amber-100">
                        {t({ en: 'not recognised', es: 'no se reconoce' })}
                      </span>
                    ) : (
                      counts[item] !== undefined && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100">
                          {counts[item]} {t({ en: 'samples', es: 'ejemplos' })}
                        </span>
                      )
                    )}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>

        <div className="lg:sticky lg:top-4 lg:self-start">
          <Card title={`${t({ en: 'Letter', es: 'Letra' })} ${letter}`}>
            <div className="mb-4 flex justify-center">
              <SignPicture image={language.images[letter]} size="lg" />
            </div>
            {language.notRecognised[letter] ? (
              <Notice tone="warning">{t(language.notRecognised[letter])}</Notice>
            ) : (
              expected && (
                <>
                  {motion && (
                    <p className="mb-3">
                      {t({
                        en: `The handshape of ${motion.base}, ${motion.movement.en}. The demo recognises it by the movement.`,
                        es: `La forma de la ${motion.base}, ${motion.movement.es}. La demo la reconoce por el movimiento.`
                      })}
                    </p>
                  )}
                  <h3 className="mb-2 font-medium">{t({ en: 'What each finger does', es: 'Qué hace cada dedo' })}</h3>
                  <FingerTable expected={expected} detected={null} flip={settings.mirror} />
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    {t({
                      en: settings.mirror
                        ? 'The arrows point as you see your right hand in the mirror view of the demo.'
                        : 'The arrows point as you see your right hand in the camera (not mirrored).',
                      es: settings.mirror
                        ? 'Las flechas apuntan como ves tu mano derecha en la vista de espejo de la demo.'
                        : 'Las flechas apuntan como ves tu mano derecha en la cámara (sin espejo).'
                    })}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link className="btn btn-primary no-underline" to={`/demo?letter=${encodeURIComponent(letter)}`}>
                      {t({ en: 'Try it in the demo', es: 'Probarla en la demo' })}
                    </Link>
                    <Link className="btn no-underline" to="/train">
                      {t({ en: 'Record samples', es: 'Grabar ejemplos' })}
                    </Link>
                  </div>
                </>
              )
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
