import * as handPoseDetection from '@tensorflow-models/hand-pose-detection'
import type { MediaPipeHandsMediaPipeModelConfig, MediaPipeHandsTfjsModelConfig } from '@tensorflow-models/hand-pose-detection';
import * as tfjs from '@tensorflow/tfjs'
import * as fp from 'fingerpose'
import * as handsignMultiligual from 'handsign-multilingual'
import { useCallback, useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import type { Keypoint3D, PosDataArray } from '../index.d.ts';
import DevicesInfo from './DevicesInfo';
import { _drawFinger, _drawTextBG } from './drawUtils';
// tfjs.setBackend('webgl');


export default function HandSignMultilingual() {

    const [debugInfo, setDebugInfo] = useState<{ left: PosDataArray, right: PosDataArray }>({
        left: [],
        right: []
    })
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

        const signs = Object.values(HandSignsSSL.signs) as fp.GestureDescription[]
        const _gestureEstimator = new fp.GestureEstimator(signs)

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
        if (gestureEstimatorRef.current === null) return

        for (const hand of predictions) {
            if (!hand.keypoints3D) return
            if (hand.score < 0.5) return

            _drawFinger(ctx, hand.keypoints)
            const landmark3D = hand.keypoints3D.map(({ x, y, z }) => [x, y, z]) as unknown as Keypoint3D[]
            const estimatedGestures = gestureEstimatorRef.current.estimate(landmark3D, 8.5)
            if (hand.handedness === "Right") {
                setDebugInfo(prevState => {
                    return {
                        ...prevState,
                        right: estimatedGestures.poseData
                    }
                })
            }
            if (hand.handedness === "Left") {
                setDebugInfo(prevState => {
                    return {
                        ...prevState,
                        left: estimatedGestures.poseData
                    }
                })
            }
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

    const copyToClipboard = () => {
        navigator.clipboard.writeText(JSON.stringify(debugInfo));
    }

    return (
        <>
            <h1 className='text-3xl mb-2'>Handsign multilingual</h1>
            <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2	relative overflow-hidden">
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



                <div className="">

                    <details className='mb-3 border-2 border-dashed border-stone-500 bg-gray-200 p-4 shadow [&_svg]:open:-rotate-180'>
                        <summary className='flex cursor-pointer list-none items-center text-xl'>
                            <svg className="rotate-0 transform text-blue-700 transition-all duration-300" fill="none" height="20" width="20" style={{ stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2" }} viewBox="0 0 24 24">
                                <title>OPEN</title>
                                <polyline points="6 9 12 15 18 9" />
                            </svg>
                            <h3 className='ms-2'>Debug</h3>
                        </summary>
                        <main className='mt-2'>
                            <button type="button"
                                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                                onClick={copyToClipboard}> Copy to clipboard</button>
                            <button type="button"
                                className="ms-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                                onClick={info}>Log</button>

                            <hr />

                            <h3>Left</h3>
                            <pre>{debugInfo.left.join("\n")}</pre>
                            <h3>Right</h3>
                            <pre>{debugInfo.right.join("\n")}</pre>
                        </main>
                    </details>
                    <details className='mb-3 border-2 border-dashed border-stone-500 bg-gray-200 p-4 shadow [&_svg]:open:-rotate-180'>
                        <summary className='flex cursor-pointer list-none items-center text-xl'>
                            <svg className="rotate-0 transform text-blue-700 transition-all duration-300" fill="none" height="20" width="20" style={{ stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2" }} viewBox="0 0 24 24">
                                <title>OPEN</title>
                                <polyline points="6 9 12 15 18 9" />
                            </svg>
                            <h3 className='ms-2'>Info devices</h3>
                        </summary>
                        <main className='mt-2'>
                            <DevicesInfo onDeviceChange={onDeviceChange} />
                        </main>
                    </details>
                </div>
                <div className="">

                </div>
            </div>
        </>
    )
}