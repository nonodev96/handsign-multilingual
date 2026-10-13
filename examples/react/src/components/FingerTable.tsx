import type { ExpectedFinger, FingerPose } from 'handsign-multilingual'
import { CURL_NAMES, FINGER_NAMES, arrow } from '../fingers'
import { useT } from '../settings'

type FingerTableProps = {
  expected: ExpectedFinger[]
  /** What the camera sees (null: no hand) */
  detected: FingerPose[] | null
  flip: boolean
}

/**
 * What a letter expects of each finger and what the camera sees, finger by finger: what matches and what does not.
 * The arrows point as on screen
 */
export function FingerTable({ expected, detected, flip }: FingerTableProps) {
  const t = useT()
  const mark = (ok: boolean) => (
    <span className={ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
      {ok ? '✓' : '✗'}
      <span className="sr-only">{ok ? t({ en: ' matches', es: ' coincide' }) : t({ en: ' does not match', es: ' no coincide' })}</span>
    </span>
  )
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left dark:border-slate-700">
            <th scope="col" className="py-1 pe-2 font-medium">{t({ en: 'Finger', es: 'Dedo' })}</th>
            <th scope="col" className="py-1 pe-2 font-medium">{t({ en: 'Expected', es: 'Esperado' })}</th>
            {detected && <th scope="col" className="py-1 font-medium">{t({ en: 'Camera', es: 'Cámara' })}</th>}
          </tr>
        </thead>
        <tbody>
          {expected.map(({ finger, curls, directions }, index) => {
            const seen = detected?.[index]
            const curlOk = seen !== undefined && curls.some(({ curl }) => curl === seen.curl)
            const directionOk = seen !== undefined && directions.some(({ direction }) => direction === seen.direction)
            return (
              <tr key={finger} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                <th scope="row" className="py-1.5 pe-2 text-left font-medium">{t(FINGER_NAMES[finger])}</th>
                <td className="py-1.5 pe-2">
                  {curls.map(({ curl }) => t(CURL_NAMES[curl])).join(t({ en: ' or ', es: ' o ' }))}{' '}
                  <span className="text-lg leading-none" title={directions.map(({ direction }) => direction).join(', ')}>
                    {directions.map(({ direction }) => arrow(direction, flip)).join(' ')}
                  </span>
                </td>
                {detected && (
                  <td className="py-1.5">
                    {seen ? (
                      <>
                        {t(CURL_NAMES[seen.curl])} {mark(curlOk)}{' '}
                        <span className="text-lg leading-none" title={seen.direction}>
                          {arrow(seen.direction, flip)}
                        </span>{' '}
                        {mark(directionOk)}
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
