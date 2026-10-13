import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { STORAGE_KEY, type Settings, SettingsContext, defaults, load } from './settings'

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(load)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch {
      // Private mode or blocked storage: the settings last until the page is closed
    }
    document.documentElement.lang = settings.ui
  }, [settings])

  const update = useCallback((changes: Partial<Settings>) => setSettings((previous) => ({ ...previous, ...changes })), [])
  const reset = useCallback(() => setSettings(defaults()), [])
  const value = useMemo(() => ({ settings, update, reset }), [settings, update, reset])
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}
