import type { Hand } from '@tensorflow-models/hand-pose-detection'
import { HandMotionTracker } from 'handsign-multilingual'
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { cameraAvailable, useCamera, useHandTracking } from '../camera'
import { SIGN_LANGUAGES } from '../languages'
import { LetterSmoother, type Recognition, handKeys, recognize } from '../recognition'
import { useSamples } from '../samples'
import { type Text, useSettings, useT } from '../settings'
import { Notice } from './ui'

export type Frame = {
  recognitions: Recognition[]
  /** The key of each hand, in the order of `recognitions` (see handKeys) */
  keys: string[]
  /** The steady letter of each hand, by its key (a letter with movement, for a moment after it is made) */
  stable: Record<string, string | null>
  /** The letter with movement each hand has just made, by its key (only in the frame it is recognised) */
  motions: Record<string, string | null>
  /** Where the centre of each hand has been lately, in pixels of the video, by its key */
  trails: Record<string, Array<{ x: number; y: number }>>
  /** The size of the video, in pixels */
  size: { width: number; height: number }
  fps: number
}

/** How long a letter with movement stays on screen after it is made */
const MOTION_SHOWN_MS = 1200
const TRAIL_MS = 1500

// Each finger in its colour (MediaPipe's order of points: wrist, then 4 points per finger)
const FINGERS = [
  { points: [0, 1, 2, 3, 4], color: '#f97316' },
  { points: [0, 5, 6, 7, 8], color: '#eab308' },
  { points: [9, 10, 11, 12], color: '#22c55e' },
  { points: [13, 14, 15, 16], color: '#06b6d4' },
  { points: [0, 17, 18, 19, 20], color: '#a855f7' }
]
const PALM = [5, 9, 13, 17]

function draw(canvas: HTMLCanvasElement, frame: Frame, mirror: boolean, skeleton: boolean) {
  const context = canvas.getContext('2d')
  if (context === null) return
  context.clearRect(0, 0, canvas.width, canvas.height)
  const scale = canvas.width / 640
  frame.recognitions.forEach((recognition, index) => {
    const points = recognition.keypoints
    // The way the hand has gone, fading: it shows the movement of LL, Ñ and RR
    const trail = frame.trails[frame.keys[index]] ?? []
    for (let i = 1; i < trail.length; i++) {
      context.strokeStyle = `rgba(253, 224, 71, ${(i / trail.length) * 0.9})`
      context.lineWidth = 6 * scale
      context.lineCap = 'round'
      context.beginPath()
      context.moveTo(trail[i - 1].x, trail[i - 1].y)
      context.lineTo(trail[i].x, trail[i].y)
      context.stroke()
    }
    if (skeleton) {
      context.lineWidth = 3 * scale
      context.lineCap = 'round'
      context.strokeStyle = 'rgba(255, 255, 255, 0.8)'
      context.beginPath()
      PALM.forEach((point, i) => (i === 0 ? context.moveTo(points[point].x, points[point].y) : context.lineTo(points[point].x, points[point].y)))
      context.stroke()
      for (const { points: finger, color } of FINGERS) {
        context.strokeStyle = color
        context.beginPath()
        finger.forEach((point, i) => (i === 0 ? context.moveTo(points[point].x, points[point].y) : context.lineTo(points[point].x, points[point].y)))
        context.stroke()
        for (const point of finger.slice(1)) {
          context.fillStyle = color
          context.beginPath()
          context.arc(points[point].x, points[point].y, 4 * scale, 0, 2 * Math.PI)
          context.fill()
        }
      }
    }
    // The letter above the hand, written so it reads well also when the video is shown as a mirror
    const letter = frame.stable[frame.keys[index]]
    if (letter) {
      const top = Math.min(...points.map(({ y }) => y))
      const xs = points.map(({ x }) => x)
      const x = (Math.min(...xs) + Math.max(...xs)) / 2
      const size = 64 * scale
      const y = Math.max(size, top - 12 * scale)
      context.save()
      context.translate(x, y)
      if (mirror) context.scale(-1, 1)
      context.font = `700 ${size}px system-ui, sans-serif`
      context.textAlign = 'center'
      context.textBaseline = 'bottom'
      context.lineWidth = 8 * scale
      context.strokeStyle = 'rgba(15, 23, 42, 0.85)'
      context.strokeText(letter, 0, 0)
      context.fillStyle = '#fde047'
      context.fillText(letter, 0, 0)
      context.restore()
    }
  })
}

const CAMERA_ERRORS: Record<string, Text> = {
  insecure: {
    en: 'The camera needs HTTPS or localhost. Open the page from localhost, or start the demo with "pnpm dev:react:https".',
    es: 'La cámara necesita HTTPS o localhost. Abre la página desde localhost o arranca la demo con «pnpm dev:react:https».'
  },
  denied: {
    en: 'The browser has no permission to use the camera. Allow it in the address bar and reload the page.',
    es: 'El navegador no tiene permiso para usar la cámara. Dale permiso en la barra de direcciones y recarga la página.'
  },
  missing: { en: 'No camera was found.', es: 'No se ha encontrado ninguna cámara.' },
  busy: {
    en: 'The camera is being used by another app or tab. Close it and reload the page.',
    es: 'Otra aplicación o pestaña está usando la cámara. Ciérrala y recarga la página.'
  },
  other: { en: 'The camera could not be opened.', es: 'No se ha podido abrir la cámara.' }
}

type CameraViewProps = {
  onFrame?: (frame: Frame) => void
  /** Over the video (for example, a countdown) */
  overlay?: ReactNode
}

/**
 * The camera with the hands found in it: their points, the steady letter of each one and the controls of the camera.
 * Each frame goes to `onFrame` with what was recognised
 */
export function CameraView({ onFrame, overlay }: CameraViewProps) {
  const t = useT()
  const { settings, update } = useSettings()
  const { classifier } = useSamples()
  const [video, setVideo] = useState<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const smoother = useRef(new LetterSmoother())
  // For each hand: its movement, the letter with movement on screen and the way it has gone
  const trackers = useRef(new Map<string, HandMotionTracker>())
  const shown = useRef(new Map<string, { letter: string; until: number }>())
  const trails = useRef(new Map<string, Array<{ x: number; y: number; time: number }>>())
  const [fps, setFps] = useState(0)
  const [handsSeen, setHandsSeen] = useState(0)
  const lastUiUpdate = useRef(0)

  const camera = useCamera(video, true, settings.deviceId)
  const ready = camera.state.status === 'ready'

  // Another sign language: other letters with movement
  useEffect(() => {
    trackers.current.clear()
    shown.current.clear()
  }, [settings.signLanguage])

  const onHands = useCallback(
    (hands: Hand[], framesPerSecond: number) => {
      const now = performance.now()
      const recognitions = hands.map((hand) => recognize(hand, settings, classifier))
      const keys = handKeys(recognitions)
      smoother.current.forget(keys)
      for (const map of [trackers.current, shown.current, trails.current]) {
        for (const key of [...map.keys()]) if (!keys.includes(key)) map.delete(key)
      }
      const motionSigns = SIGN_LANGUAGES[settings.signLanguage].signs.motions ?? []
      const stable: Record<string, string | null> = {}
      const motions: Record<string, string | null> = {}
      const trailsOf: Frame['trails'] = {}
      recognitions.forEach((recognition, index) => {
        const key = keys[index]
        let tracker = trackers.current.get(key)
        if (tracker === undefined) {
          tracker = new HandMotionTracker(motionSigns)
          trackers.current.set(key, tracker)
        }
        const motion = tracker.update(recognition.hand, recognition.letter, now)
        motions[key] = motion
        if (motion !== null) shown.current.set(key, { letter: motion, until: now + MOTION_SHOWN_MS })
        const steady = smoother.current.push(key, recognition.letter)
        const showing = shown.current.get(key)
        stable[key] = showing !== undefined && showing.until > now ? showing.letter : steady
        const points = recognition.keypoints
        const trail = (trails.current.get(key) ?? []).filter(({ time }) => now - time <= TRAIL_MS)
        trail.push({
          x: points.reduce((sum, { x }) => sum + x, 0) / points.length,
          y: points.reduce((sum, { y }) => sum + y, 0) / points.length,
          time: now
        })
        trails.current.set(key, trail)
        trailsOf[key] = trail
      })
      const size = { width: video?.videoWidth ?? 0, height: video?.videoHeight ?? 0 }
      const frame: Frame = { recognitions, keys, stable, motions, trails: trailsOf, size, fps: framesPerSecond }
      const canvas = canvasRef.current
      if (canvas !== null && video !== null) {
        if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth
        if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight
        draw(canvas, frame, settings.mirror, settings.skeleton)
      }
      onFrame?.(frame)
      // The counters, a few times a second
      if (now - lastUiUpdate.current > 250) {
        lastUiUpdate.current = now
        setFps(framesPerSecond)
        setHandsSeen(hands.length)
      }
    },
    [settings, classifier, video, onFrame]
  )

  const detector = useHandTracking(video, ready, settings, onHands)
  const aspectRatio = camera.state.status === 'ready' ? `${camera.state.width} / ${camera.state.height}` : '16 / 9'

  return (
    <div className="flex flex-col gap-2">
      <div className="relative w-full overflow-hidden rounded-xl bg-slate-900 shadow-inner" style={{ aspectRatio }}>
        <div className="absolute inset-0" style={{ transform: settings.mirror ? 'scaleX(-1)' : undefined }}>
          <video ref={setVideo} className="h-full w-full object-contain" playsInline muted aria-label={t({ en: 'Camera', es: 'Cámara' })} />
          <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full object-contain" aria-hidden="true" />
        </div>
        {overlay}
        {camera.state.status === 'starting' && <Status>{t({ en: 'Opening the camera…', es: 'Abriendo la cámara…' })}</Status>}
        {ready && detector.status === 'loading' && (
          <Status>{t({ en: 'Loading the hand model (MediaPipe Hands)…', es: 'Cargando el modelo de manos (MediaPipe Hands)…' })}</Status>
        )}
        {ready && detector.status === 'ready' && handsSeen === 0 && (
          <p className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-slate-900/75 px-4 py-1 text-sm text-white">
            {t({ en: 'Show your hand to the camera, palm facing it', es: 'Enseña la mano a la cámara, con la palma hacia ella' })}
          </p>
        )}
      </div>

      {camera.state.status === 'error' && (
        <Notice tone="error">
          {t(CAMERA_ERRORS[camera.state.reason])}
          {camera.state.message && <span className="block text-xs opacity-75">{camera.state.message}</span>}
        </Notice>
      )}
      {detector.status === 'error' && (
        <Notice tone="error">
          {t({
            en: 'The hand model could not be loaded (it comes from cdn.jsdelivr.net). Check the connection and reload the page.',
            es: 'No se ha podido cargar el modelo de manos (viene de cdn.jsdelivr.net). Revisa la conexión y recarga la página.'
          })}
          {detector.message && <span className="block text-xs opacity-75">{detector.message}</span>}
        </Notice>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        {cameraAvailable() && camera.devices.length > 1 && (
          <label className="flex items-center gap-2">
            {t({ en: 'Camera', es: 'Cámara' })}
            <select className="field" value={settings.deviceId} onChange={(event) => update({ deviceId: event.target.value })}>
              <option value="">{t({ en: 'Default', es: 'Por defecto' })}</option>
              {camera.devices.map((device, index) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `${t({ en: 'Camera', es: 'Cámara' })} ${index + 1}`}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={settings.mirror} onChange={(event) => update({ mirror: event.target.checked })} />
          {t({ en: 'Mirror view', es: 'Ver como un espejo' })}
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={settings.skeleton} onChange={(event) => update({ skeleton: event.target.checked })} />
          {t({ en: 'Show the hand points', es: 'Ver los puntos de la mano' })}
        </label>
        <span className="ms-auto tabular-nums text-slate-500 dark:text-slate-400">
          {ready && detector.status === 'ready' ? `${fps.toFixed(0)} fps` : ''}
        </span>
      </div>
    </div>
  )
}

function Status({ children }: { children: ReactNode }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 p-4 text-center text-white" role="status">
      <span className="flex items-center gap-3">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" />
        {children}
      </span>
    </div>
  )
}
