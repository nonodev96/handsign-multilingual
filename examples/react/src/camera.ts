import * as handPoseDetection from '@tensorflow-models/hand-pose-detection'
import { useCallback, useEffect, useRef, useState } from 'react'

export type CameraState =
  | { status: 'idle' }
  | { status: 'starting' }
  | { status: 'ready'; width: number; height: number }
  | { status: 'error'; reason: 'insecure' | 'denied' | 'missing' | 'busy' | 'other'; message: string }

/** Browsers only give access to the camera on HTTPS or localhost */
export const cameraAvailable = () => window.isSecureContext && typeof navigator.mediaDevices?.getUserMedia === 'function'

const reasonOf = (error: unknown): Extract<CameraState, { status: 'error' }>['reason'] => {
  const name = error instanceof DOMException ? error.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied'
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'missing'
  if (name === 'NotReadableError' || name === 'AbortError') return 'busy'
  return 'other'
}

/** The camera in the <video>: it starts when `enabled`, with the device chosen (or the front one) */
export function useCamera(video: HTMLVideoElement | null, enabled: boolean, deviceId: string) {
  const [state, setState] = useState<CameraState>({ status: 'idle' })
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])

  const listDevices = useCallback(async () => {
    if (!cameraAvailable()) return
    const all = await navigator.mediaDevices.enumerateDevices()
    setDevices(all.filter(({ kind }) => kind === 'videoinput'))
  }, [])

  useEffect(() => {
    if (!enabled || video === null) return
    if (!cameraAvailable()) {
      setState({ status: 'error', reason: 'insecure', message: '' })
      return
    }
    let stream: MediaStream | null = null
    let cancelled = false
    setState({ status: 'starting' })
    navigator.mediaDevices
      .getUserMedia({
        audio: false,
        video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      .then(async (media) => {
        if (cancelled) {
          for (const track of media.getTracks()) track.stop()
          return
        }
        stream = media
        video.srcObject = media
        await video.play().catch(() => undefined)
        setState({ status: 'ready', width: video.videoWidth, height: video.videoHeight })
        // With permission, the devices have names
        listDevices()
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ status: 'error', reason: reasonOf(error), message: String(error) })
      })
    return () => {
      cancelled = true
      for (const track of stream?.getTracks() ?? []) track.stop()
      video.srcObject = null
    }
  }, [video, enabled, deviceId, listDevices])

  return { state, devices }
}

export type DetectorState = { status: 'loading' } | { status: 'ready' } | { status: 'error'; message: string }

const detectors = new Map<string, Promise<handPoseDetection.HandDetector>>()

/**
 * The MediaPipe Hands detector, one per configuration and shared by the pages. The solution files come from a CDN, in
 * the version installed
 */
function getDetector(modelType: 'lite' | 'full', maxHands: number) {
  const key = `${modelType}-${maxHands}`
  let detector = detectors.get(key)
  if (detector === undefined) {
    detector = handPoseDetection.createDetector(handPoseDetection.SupportedModels.MediaPipeHands, {
      runtime: 'mediapipe',
      solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240',
      modelType,
      maxHands
    })
    detector.catch(() => detectors.delete(key))
    detectors.set(key, detector)
  }
  return detector
}

/**
 * Finds the hands in each frame of the video, one frame at a time (the next one when the previous is done), and gives
 * them to `onHands` with the frames per second
 */
export function useHandTracking(
  video: HTMLVideoElement | null,
  running: boolean,
  { modelType, maxHands }: { modelType: 'lite' | 'full'; maxHands: number },
  onHands: (hands: handPoseDetection.Hand[], fps: number) => void
) {
  const [state, setState] = useState<DetectorState>({ status: 'loading' })
  const onHandsRef = useRef(onHands)
  onHandsRef.current = onHands

  useEffect(() => {
    let cancelled = false
    let frame = 0
    setState({ status: 'loading' })
    getDetector(modelType, maxHands)
      .then((detector) => {
        if (cancelled) return
        setState({ status: 'ready' })
        if (!running || video === null) return
        let last = performance.now()
        let fps = 0
        const loop = async () => {
          if (cancelled) return
          if (video.readyState >= 2 && video.videoWidth > 0) {
            try {
              const hands = await detector.estimateHands(video, { flipHorizontal: false })
              const now = performance.now()
              fps = fps === 0 ? 1000 / (now - last) : fps * 0.9 + (1000 / (now - last)) * 0.1
              last = now
              if (!cancelled) onHandsRef.current(hands, fps)
            } catch (error) {
              console.error(error)
            }
          }
          if (!cancelled) frame = requestAnimationFrame(loop)
        }
        frame = requestAnimationFrame(loop)
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ status: 'error', message: String(error) })
      })
    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
    }
  }, [video, running, modelType, maxHands])

  return state
}
