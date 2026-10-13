import { createContext, useCallback, useContext } from 'react'

export type SignLanguageId = 'ASL' | 'SSL'
export type UiLanguage = 'en' | 'es'
/** Which recognizer decides the letter: the rules of the library, your samples, or your samples when there are */
export type Recognizer = 'auto' | 'rules' | 'samples'

export type Settings = {
  signLanguage: SignLanguageId
  ui: UiLanguage
  /** Show the camera as a mirror (it only changes what you see, not what is recognised) */
  mirror: boolean
  /** Minimum score of the rules, from 0 to 1 */
  minScore: number
  /** Minimum share of the vote of your samples, from 0 to 1 */
  minShare: number
  recognizer: Recognizer
  modelType: 'lite' | 'full'
  maxHands: 1 | 2
  deviceId: string
  /** Draw the 21 points of each hand over the video */
  skeleton: boolean
  /** Use also the ready-made samples of the language (handsign-multilingual/samples), when there are */
  baseSamples: boolean
  /** Who records the samples (optional): saved with each hand, to measure with several people */
  recorder: string
  /** When a letter is recorded, go on with the next one */
  autoNext: boolean
}

export const STORAGE_KEY = 'handsign-demo-settings'

const browserUi = (): UiLanguage => (navigator.language?.toLowerCase().startsWith('es') ? 'es' : 'en')

export const defaults = (): Settings => {
  const ui = browserUi()
  return {
    signLanguage: ui === 'es' ? 'SSL' : 'ASL',
    ui,
    mirror: true,
    minScore: 0.8,
    minShare: 0.6,
    recognizer: 'auto',
    modelType: 'full',
    maxHands: 2,
    deviceId: '',
    skeleton: true,
    baseSamples: true,
    recorder: '',
    autoNext: true
  }
}

export const load = (): Settings => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    return { ...defaults(), ...saved }
  } catch {
    return defaults()
  }
}

export type SettingsContext = {
  settings: Settings
  update: (changes: Partial<Settings>) => void
  reset: () => void
}

export const SettingsContext = createContext<SettingsContext | null>(null)

export function useSettings() {
  const context = useContext(SettingsContext)
  if (context === null) throw new Error('useSettings needs a SettingsProvider')
  return context
}

/** A text in the language of the interface: t({ en: 'Hello', es: 'Hola' }) */
export type Text = Record<UiLanguage, string>

export function useT() {
  const { settings } = useSettings()
  return useCallback((text: Text) => text[settings.ui], [settings.ui])
}
