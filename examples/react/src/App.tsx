import { NavLink, Outlet } from 'react-router-dom'
import { SIGN_LANGUAGES } from './languages'
import { SamplesProvider } from './SamplesProvider'
import { SettingsProvider } from './SettingsProvider'
import { type SignLanguageId, type Text, type UiLanguage, useSettings, useT } from './settings'

const PAGES: Array<{ to: string; label: Text }> = [
  { to: '/', label: { en: 'Home', es: 'Inicio' } },
  { to: '/demo', label: { en: 'Live demo', es: 'Demo en directo' } },
  { to: '/alphabet', label: { en: 'Alphabet', es: 'Alfabeto' } },
  { to: '/train', label: { en: 'Train', es: 'Entrenar' } },
  { to: '/practice', label: { en: 'Practise', es: 'Practicar' } }
]

function Header() {
  const t = useT()
  const { settings, update } = useSettings()
  return (
    <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
        <NavLink to="/" className="flex items-center gap-2 text-lg font-bold text-slate-900 no-underline dark:text-white">
          <span aria-hidden="true" className="text-2xl">
            🤟
          </span>
          Handsign multilingual
        </NavLink>
        <nav aria-label={t({ en: 'Pages', es: 'Páginas' })} className="order-3 w-full overflow-x-auto md:order-none md:w-auto">
          <ul className="flex gap-1">
            {PAGES.map(({ to, label }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `block whitespace-nowrap rounded-md px-3 py-1.5 text-sm no-underline ${
                      isActive
                        ? 'bg-indigo-50 font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200'
                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`
                  }
                >
                  {t(label)}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ms-auto flex min-w-0 flex-wrap items-center gap-2">
          <label className="flex min-w-0 items-center gap-2 text-sm">
            <span className="sr-only lg:not-sr-only">{t({ en: 'Sign language', es: 'Lengua de signos' })}</span>
            <select
              className="field min-w-0 max-w-[11rem] sm:max-w-none"
              value={settings.signLanguage}
              onChange={(event) => update({ signLanguage: event.target.value as SignLanguageId })}
            >
              {Object.values(SIGN_LANGUAGES).map(({ id, name }) => (
                <option key={id} value={id}>
                  {id}: {t(name)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <span className="sr-only">{t({ en: 'Language of the page', es: 'Idioma de la página' })}</span>
            <select className="field" value={settings.ui} onChange={(event) => update({ ui: event.target.value as UiLanguage })}>
              <option value="en" lang="en">
                English
              </option>
              <option value="es" lang="es">
                Español
              </option>
            </select>
          </label>
        </div>
      </div>
    </header>
  )
}

function Footer() {
  const t = useT()
  return (
    <footer className="border-t border-slate-200 py-6 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-400">
      <div className="mx-auto flex max-w-7xl flex-wrap gap-x-6 gap-y-2 px-4">
        <a href="https://github.com/nonodev96/handsign-multilingual">GitHub</a>
        <a href="https://www.npmjs.com/package/handsign-multilingual">npm</a>
        <span>
          {t({ en: 'BSD-2-Clause license. American Sign Language from ', es: 'Licencia BSD-2-Clause. Lengua de signos americana de ' })}
          <a href="https://github.com/syauqy/handsign-tensorflow">syauqy/handsign-tensorflow</a>.
        </span>
        <span>
          {t({
            en: 'The camera never leaves your browser: everything runs on your device.',
            es: 'La cámara no sale de tu navegador: todo se ejecuta en tu dispositivo.'
          })}
        </span>
      </div>
    </footer>
  )
}

function Layout() {
  const t = useT()
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:p-2"
      >
        {t({ en: 'Skip to content', es: 'Saltar al contenido' })}
      </a>
      <Header />
      <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

export default function App() {
  return (
    <SettingsProvider>
      <SamplesProvider>
        <Layout />
      </SamplesProvider>
    </SettingsProvider>
  )
}
