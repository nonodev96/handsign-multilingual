import { Link } from 'react-router-dom'
import { usePageTitle } from '../pageTitle'
import { Card, CodeBlock, SignPicture } from '../components/ui'
import { SIGN_LANGUAGES } from '../languages'
import { type Text, useSettings, useT } from '../settings'

const STEPS: Array<{ title: Text; text: Text }> = [
  {
    title: { en: '1. The camera', es: '1. La cámara' },
    text: {
      en: 'Each frame of the video stays in your browser: nothing is uploaded.',
      es: 'Cada fotograma del vídeo se queda en tu navegador: no se sube nada.'
    }
  },
  {
    title: { en: '2. The hand', es: '2. La mano' },
    text: {
      en: 'MediaPipe Hands (hand-pose-detection) finds up to two hands and 21 points on each.',
      es: 'MediaPipe Hands (hand-pose-detection) encuentra hasta dos manos y 21 puntos en cada una.'
    }
  },
  {
    title: { en: '3. The same frame', es: '3. El mismo marco' },
    text: {
      en: 'The library turns the left hand and mirrored images into the frame the letters are described in.',
      es: 'La librería lleva la mano izquierda y las imágenes en espejo al marco en el que están descritas las letras.'
    }
  },
  {
    title: { en: '4. The letter', es: '4. La letra' },
    text: {
      en: 'The rules (how bent each finger is and where it points) or your own samples decide the letter.',
      es: 'Las reglas (cuánto se dobla cada dedo y hacia dónde apunta) o tus propios ejemplos deciden la letra.'
    }
  }
]

const INSTALL = 'pnpm add handsign-multilingual @tensorflow-models/hand-pose-detection'

const RULES_CODE = `import { HandSignsASL, createHandSignEstimator } from 'handsign-multilingual'

const estimator = createHandSignEstimator(HandSignsASL, { minScore: 0.8 })

// hands: from detector.estimateHands(video) (hand-pose-detection)
for (const hand of hands) {
  const { letters, fingers } = estimator.estimate(hand)
  console.log(letters[0]) // { letter: 'A', score: 0.94 }
}`

const SAMPLES_CODE = `import { HandSignClassifier } from 'handsign-multilingual'
import { SamplesASL } from 'handsign-multilingual/samples'

// Ready-made samples (American Sign Language), and yours on top
const classifier = HandSignClassifier.fromJSON(SamplesASL)
classifier.add('A', hand)
const [best] = classifier.predict(hand) // { letter: 'A', score: 1, distance: 0.21 }`

const IMAGES_CODE = `import { SignImagesASL } from 'handsign-multilingual/images'

<img src={SignImagesASL.A.hand} alt="A" />`

export default function Home() {
  usePageTitle({ en: 'Home', es: 'Inicio' })
  const t = useT()
  const { settings } = useSettings()
  const language = SIGN_LANGUAGES[settings.signLanguage]
  const copy = t({ en: 'Copy', es: 'Copiar' })
  const copied = t({ en: 'Copied', es: 'Copiado' })

  return (
    <div className="flex flex-col gap-10">
      <section className="grid items-center gap-8 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">
            {t({ en: 'Fingerspelling in the browser', es: 'Deletreo con las manos en el navegador' })}
          </h1>
          <p className="mt-4 text-lg text-slate-700 dark:text-slate-300">
            {t({
              en: 'handsign-multilingual recognises the letters of the American and Spanish sign language alphabets from the camera, with TensorFlow.js and MediaPipe Hands. Everything runs on your device.',
              es: 'handsign-multilingual reconoce las letras de los alfabetos de la lengua de signos americana y española desde la cámara, con TensorFlow.js y MediaPipe Hands. Todo se ejecuta en tu dispositivo.'
            })}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/demo" className="btn btn-primary px-5 py-2.5 text-base no-underline">
              {t({ en: 'Try the live demo', es: 'Probar la demo en directo' })}
            </Link>
            <Link to="/alphabet" className="btn px-5 py-2.5 text-base no-underline">
              {t({ en: 'See the alphabet', es: 'Ver el alfabeto' })}
            </Link>
            <Link to="/train" className="btn px-5 py-2.5 text-base no-underline">
              {t({ en: 'Train with your hand', es: 'Entrenar con tu mano' })}
            </Link>
          </div>
        </div>
        <ul className="grid grid-cols-4 gap-2" aria-label={t({ en: 'Some letters', es: 'Algunas letras' })}>
          {['A', 'B', 'C', 'L', 'O', 'V', 'W', 'Y'].map((letter) => (
            <li key={letter} className="flex flex-col items-center gap-1">
              <SignPicture image={language.images[letter]} size="sm" />
              <span className="text-sm font-semibold">{letter}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">{t({ en: 'How it works', es: 'Cómo funciona' })}</h2>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ title, text }) => (
            <li key={title.en} className="card">
              <h3 className="font-semibold">{t(title)}</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t(text)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card title={t({ en: 'Rules: ready to use', es: 'Reglas: listas para usar' })}>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            {t({
              en: 'Each letter is described with fingerpose: how bent each finger is and where it points. They need no training, but they are strict: a turned hand, or a letter made a bit differently, fails, and letters that only differ in a detail get confused. With 2122 real hands they get 38 % right.',
              es: 'Cada letra está descrita con fingerpose: cuánto se dobla cada dedo y hacia dónde apunta. No hay que entrenar nada, pero son estrictas: una mano girada, o una letra hecha algo distinta, falla, y se confunden las letras que solo cambian en un detalle. Con 2122 manos reales aciertan el 38 %.'
            })}
          </p>
        </Card>
        <Card title={t({ en: 'Your samples: more precise', es: 'Tus ejemplos: más precisos' })}>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            {t({
              en: 'The hand is compared with recorded samples (k nearest neighbours): the American alphabet comes with 2122 hands of several people, which get 92 % right, and you can add yours (also of the Spanish one). The samples are saved in your browser and can be downloaded.',
              es: 'La mano se compara con ejemplos grabados (k vecinos más cercanos): el alfabeto americano trae 2122 manos de varias personas, que aciertan el 92 %, y puedes añadir los tuyos (también del español). Los ejemplos se guardan en tu navegador y se pueden descargar.'
            })}
          </p>
          <p className="mt-2 text-sm">
            <Link to="/train">{t({ en: 'Record your samples', es: 'Graba tus ejemplos' })}</Link>
          </p>
        </Card>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">{t({ en: 'Use it in your app', es: 'Úsala en tu aplicación' })}</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-4">
            <CodeBlock code={INSTALL} copyLabel={copy} copiedLabel={copied} />
            <h3 className="font-semibold">{t({ en: 'With the rules', es: 'Con las reglas' })}</h3>
            <CodeBlock code={RULES_CODE} copyLabel={copy} copiedLabel={copied} />
          </div>
          <div className="flex min-w-0 flex-col gap-4">
            <h3 className="font-semibold">{t({ en: 'With samples', es: 'Con ejemplos' })}</h3>
            <CodeBlock code={SAMPLES_CODE} copyLabel={copy} copiedLabel={copied} />
            <h3 className="font-semibold">{t({ en: 'The pictures of the letters', es: 'Los dibujos de las letras' })}</h3>
            <CodeBlock code={IMAGES_CODE} copyLabel={copy} copiedLabel={copied} />
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">{t({ en: 'Languages', es: 'Lenguas' })}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {Object.values(SIGN_LANGUAGES).map((item) => (
            <Card key={item.id} title={`${item.id}: ${t(item.name)}`}>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {t({
                  en: `${Object.keys(item.descriptions).length + Object.keys(item.motions).length} letters recognised out of ${item.alphabet.length}.`,
                  es: `${Object.keys(item.descriptions).length + Object.keys(item.motions).length} letras reconocidas de ${item.alphabet.length}.`
                })}{' '}
                {Object.keys(item.motions).length > 0 &&
                  t({
                    en: `${Object.keys(item.motions).join(', ')} are recognised by their movement.`,
                    es: `${Object.keys(item.motions).join(', ')} se reconocen por su movimiento.`
                  })}
              </p>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">{t({ en: 'Limits', es: 'Límites' })}</h2>
        <ul className="list-disc space-y-1 ps-5 text-slate-700 dark:text-slate-300">
          <li>
            {t({
              en: 'Letters, not words: of the movements, it recognises the shift and the shake of LL, Ñ and RR; J, Z and the signs of words need more.',
              es: 'Letras, no palabras: de los movimientos, reconoce el desplazamiento y el vaivén de LL, Ñ y RR; la J, la Z y los signos de palabras necesitan más.'
            })}
          </li>
          <li>
            {t({
              en: 'The rules depend on the camera seeing the palm: with the hand very turned, or fingers hidden behind others, they fail.',
              es: 'Las reglas dependen de que la cámara vea la palma: con la mano muy girada, o dedos tapados por otros, fallan.'
            })}
          </li>
          <li>
            {t({
              en: 'The Spanish alphabet is still being reviewed letter by letter.',
              es: 'El alfabeto español se está revisando todavía letra a letra.'
            })}
          </li>
        </ul>
      </section>
    </div>
  )
}
