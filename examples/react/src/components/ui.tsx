import { type ReactNode, useEffect, useState } from 'react'
import type { SignImage } from 'handsign-multilingual/images'

const TONES = {
  info: 'border-sky-300 bg-sky-50 text-sky-950 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-100',
  warning: 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100',
  error: 'border-red-300 bg-red-50 text-red-950 dark:border-red-700 dark:bg-red-950 dark:text-red-100',
  success: 'border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-100'
}

/** A message in a box; errors and warnings are announced */
export function Notice({ tone = 'info', children }: { tone?: keyof typeof TONES; children: ReactNode }) {
  const announce = tone === 'error' || tone === 'warning'
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${TONES[tone]}`} role={announce ? 'alert' : undefined}>
      {children}
    </div>
  )
}

export function Card({ title, children, actions }: { title?: ReactNode; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="card">
      {(title || actions) && (
        <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="text-lg font-semibold">{title}</h2>}
          {actions}
        </header>
      )}
      {children}
    </section>
  )
}

/** A score from 0 to 1 as a bar, with its percentage */
export function ScoreBar({ label, score, highlight = false, hint }: { label: string; score: number; highlight?: boolean; hint?: string }) {
  const percent = Math.round(score * 100)
  return (
    <div className="flex items-center gap-3">
      <span className={`w-8 text-center text-lg font-bold ${highlight ? 'text-indigo-600 dark:text-indigo-300' : ''}`}>{label}</span>
      <div
        className="h-3 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div
          className={`h-full rounded-full ${highlight ? 'bg-indigo-500' : 'bg-slate-400 dark:bg-slate-500'}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="w-12 text-right text-sm tabular-nums">{percent}%</span>
      {hint && <span className="w-16 text-right text-xs tabular-nums text-slate-500 dark:text-slate-400">{hint}</span>}
    </div>
  )
}

/** The images of a letter: the hand making it and, small, the letter */
export function SignPicture({ image, size = 'md' }: { image: SignImage | undefined; size?: 'sm' | 'md' | 'lg' }) {
  const box = { sm: 'h-16 w-16', md: 'h-28 w-28', lg: 'h-28 w-28 sm:h-44 sm:w-44' }[size]
  if (image === undefined) return <div className={`${box} rounded-lg bg-slate-100 dark:bg-slate-800`} />
  return (
    <div className={`relative ${box} shrink-0 rounded-lg bg-white p-2 ring-1 ring-slate-200 dark:ring-slate-700`}>
      <img src={image.hand} alt="" className="h-full w-full object-contain" />
      <img src={image.sign} alt="" className="absolute bottom-1 right-1 h-1/4 w-1/4 object-contain" />
    </div>
  )
}

/** Options as a row of buttons, one of them pressed */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange
}: {
  label: string
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (value: T) => void
}) {
  return (
    <fieldset>
      <legend className="mb-1 text-sm font-medium">{label}</legend>
      <div className="inline-flex flex-wrap rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={`rounded-md px-3 py-1 text-sm ${
              value === option.value
                ? 'bg-white font-semibold text-indigo-700 shadow-sm dark:bg-slate-600 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

/** Code with a button to copy it (it says when it is copied) */
export function CodeBlock({ code, copyLabel, copiedLabel }: { code: string; copyLabel: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(timer)
  }, [copied])
  return (
    <div className="min-w-0 overflow-hidden rounded-lg bg-slate-900">
      <div className="flex justify-end border-b border-slate-700 px-2 py-1">
        <button
          type="button"
          className="rounded-sm px-2 py-0.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white"
          onClick={() => navigator.clipboard?.writeText(code).then(() => setCopied(true))}
        >
          <span aria-live="polite">{copied ? copiedLabel : copyLabel}</span>
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-sm text-slate-100">
        <code>{code}</code>
      </pre>
    </div>
  )
}
