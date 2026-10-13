import { useEffect } from 'react'
import { type Text, useT } from './settings'

/** The title of the page in the browser tab */
export function usePageTitle(title: Text) {
  const t = useT()
  const text = t(title)
  useEffect(() => {
    document.title = `${text} - Handsign multilingual`
  }, [text])
}
