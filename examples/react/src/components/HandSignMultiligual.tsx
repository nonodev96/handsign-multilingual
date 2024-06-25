import * as handPoseDetection from '@tensorflow-models/hand-pose-detection'
import type { MediaPipeHandsMediaPipeModelConfig, MediaPipeHandsTfjsModelConfig } from '@tensorflow-models/hand-pose-detection';
import * as tfjs from '@tensorflow/tfjs'
import * as fp from 'fingerpose'
import * as handsignMultiligual from 'handsign-multilingual'
import { useCallback, useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import type { Keypoint3D } from '../index.d.ts';
import DevicesInfo from './DevicesInfo';
import styles from './HandSignMultiligual.module.css'
import { _drawFinger, _drawTextBG } from './drawUtils';
tfjs.setBackend('webgl');


export default function HandSignMultilingual() {

    const [deviceState, setDeviceState] = useState({
        deviceId: '',
        label: ''
    })
    const modelDetectorRef = useRef<handPoseDetection.HandDetector | null>(null)
    const gestureEstimatorRef = useRef<fp.GestureEstimator | null>(null)

    const webcamRef = useRef<Webcam | null>(null)
    const canvasRef = useRef<HTMLCanvasElement>(document.createElement("canvas"))
    const streamRef = useRef<MediaStream | null>(null)
    const requestAnimationRef = useRef<number>(0)

    const init = useCallback(async (): Promise<boolean> => {
        console.debug('Init')
        // SPANISH
        const { HandSignsSSL } = handsignMultiligual

        const signs = Object.values(HandSignsSSL.signs)
        const _gestureEstimator = new fp.GestureEstimator([
            ...signs
        ])

        gestureEstimatorRef.current = _gestureEstimator

        const model = handPoseDetection.SupportedModels.MediaPipeHands
        const detectorConfig_mediapipe: MediaPipeHandsMediaPipeModelConfig = {
            runtime: 'mediapipe', // or 'tfjs',
            solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands',
            modelType: 'full',
            maxHands: 4
        }
        const detectorConfig_tfjs: MediaPipeHandsTfjsModelConfig = {
            runtime: 'tfjs', // or 'mediapipe',
            modelType: 'full',
            maxHands: 4
        }
        console.log({ detectorConfig_mediapipe, detectorConfig_tfjs });
        // With detectorConfig_tfjs have a bug, NaN values
        const _modelDetector = await handPoseDetection.createDetector(model, detectorConfig_mediapipe)
        modelDetectorRef.current = _modelDetector
        return true
    }, [])

    const processWebcam = useCallback(() => {
        if (
            canvasRef.current === null ||
            webcamRef.current === null ||
            webcamRef.current.video === null ||
            webcamRef.current.video.readyState !== 4) {
            return null
        }
        // Get Video Properties
        const video = webcamRef.current.video

        // Set canvas width
        canvasRef.current.width = webcamRef.current.video.videoWidth
        canvasRef.current.height = webcamRef.current.video.videoHeight

        const ctx = canvasRef.current.getContext('2d') as CanvasRenderingContext2D
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
        // ctx.setTransform(-1, 0, 0, 1, canvas_ref.current.width, 0)

        return { ctx, video }

    }, [])

    const info = () => {
        console.log({
            webcam: webcamRef.current,
            canvas: canvasRef.current,
            env: tfjs.env()
        })

    }

    const onUserMedia = (stream: MediaStream) => {
        console.log({ stream })
        streamRef.current = stream
    }

    const onUserMediaError = (error: string | DOMException) => {
        console.log({ error })
    }

    useEffect(() => {
        init()
    }, [init])

    const renderHands = useCallback((ctx: CanvasRenderingContext2D, predictions: handPoseDetection.Hand[]) => {
        console.log("render", { ctx, predictions })
        if (gestureEstimatorRef.current === null) return

        for (const hand of predictions) {
            if (!hand.keypoints3D) return
            if (hand.score < 0.5) return

            _drawFinger(ctx, hand.keypoints)
            const landmark3D = hand.keypoints3D.map(({ x, y, z }) => [x, y, z]) as unknown as Keypoint3D[]
            const estimatedGestures = gestureEstimatorRef.current.estimate(landmark3D, 8.5)
            console.log({ hand: hand.handedness, estimatedGestures })

            const { x, y } = hand.keypoints[0]
            const gesturesName = estimatedGestures.gestures.map(({ name }) => name).join(' ')
            _drawTextBG(ctx, `${gesturesName}`, x, y, 16)
            _drawTextBG(ctx, `${hand.handedness}`, x, y + 32, 16)
        }
    }, [])


    useEffect(() => {
        try {
            const fps = 60
            let msPerFrame = 1000 / fps
            let msNow = window.performance.now()
            let msPrev = window.performance.now()
            let elapsed = 0
            const animate = async () => {
                requestAnimationRef.current = requestAnimationFrame(animate)
                msNow = window.performance.now()
                elapsed = msNow - msPrev
                if (elapsed < msPerFrame) {
                    return
                }
                msPrev = msNow
                // Process frame
                const _process = processWebcam()
                if (_process && modelDetectorRef.current) {
                    const { ctx, video } = _process
                    const predictions = await modelDetectorRef.current.estimateHands(video)
                    renderHands(ctx, predictions)
                }
            }

            const startAnimating = async () => {
                msPerFrame = 1000 / fps
                msPrev = window.performance.now()
                console.debug('start animation')
                await animate()
            }
            startAnimating()
        } catch (error) {
            console.error(error)
            cancelAnimationFrame(requestAnimationRef.current)
        }

        // Limpia la animación cuando el componente se desmonta
        return () => {
            console.log(`delete AnimationFrame(${requestAnimationRef.current});`)
            cancelAnimationFrame(requestAnimationRef.current)
        }
    }, [processWebcam, renderHands])

    const onDeviceChange = (mediaDeviceInfo: MediaDeviceInfo) => {
        console.log({ mediaDeviceInfo });
        setDeviceState(prevState => ({
            ...prevState,
            deviceId: mediaDeviceInfo.deviceId
        }))
    }

    return (
        <>
            <div className={styles.webcamContainer}>
                <Webcam
                    ref={webcamRef}
                    audio={false}
                    mirrored={false}
                    screenshotFormat="image/png"
                    onUserMedia={onUserMedia}
                    onUserMediaError={onUserMediaError}
                    videoConstraints={{
                        facingMode: "user",
                        deviceId: deviceState.deviceId
                    }}
                    style={{
                        position: 'relative',
                        width: '100%',
                        height: '100%',
                    }}
                />
                <canvas ref={canvasRef}
                    style={{
                        objectFit: 'contain',
                        position: 'absolute',
                        width: '100%',
                        height: '100%',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0
                    }} />
            </div>

            <hr />

            <button type="button" onClick={info}>Info</button>

            <details>
                <summary>Info devices</summary>
                <DevicesInfo onDeviceChange={onDeviceChange} />
            </details>
        </>
    )
}