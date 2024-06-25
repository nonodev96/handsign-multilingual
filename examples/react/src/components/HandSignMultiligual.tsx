import * as handPoseDetection from '@tensorflow-models/hand-pose-detection'
import * as fp from 'fingerpose'
import * as handsignMultiligual from 'handsign-multilingual'
import { useCallback, useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import DevicesInfo from './DevicesInfo';
import styles from './HandSignMultiligual.module.css'

export default function HandSignMultilingual() {

    const [deviceState, setDeviceState] = useState({
        deviceId: '',
        label: ''
    })
    const modelDetectorRef = useRef<handPoseDetection.HandDetector | null>(null)
    const gestureEstimatorRef = useRef<fp.GestureEstimator | null>(null)
    const requestAnimationRef = useRef<number>(0)
    const webcamRef = useRef(null)
    const canvasRef = useRef(null)

    const init = useCallback(async (): Promise<boolean> => {
        console.debug('Init')
        const { HandSignsSSL } = handsignMultiligual
        const signs = Object.values(HandSignsSSL.signs)

        const _gestureEstimator = new fp.GestureEstimator([
            ...signs
        ])

        gestureEstimatorRef.current = _gestureEstimator

        const model = handPoseDetection.SupportedModels.MediaPipeHands
        const detectorConfig: handPoseDetection.MediaPipeHandsMediaPipeModelConfig = {
            runtime: 'mediapipe', // or 'tfjs',
            solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands',
            modelType: 'full'
        }
        const _modelDetector = await handPoseDetection.createDetector(model, detectorConfig)
        modelDetectorRef.current = _modelDetector
        return true
    }, [])

    const predict = async (input: HTMLVideoElement) => {
        if (!modelDetectorRef.current) {
            console.debug('Predict')
            return
        }

        const predictions_hands = await modelDetectorRef.current.estimateHands(input)
        return predictions_hands
    }


    const info = () => {
        console.log({ webcam: webcamRef.current })
        console.log({ canvas: canvasRef.current })
    }

    const onUserMedia = (stream: MediaStream) => {
        console.log({ stream })
    }

    const onUserMediaError = (error: string | DOMException) => {
        console.log({ error })
    }

    useEffect(() => {
        init()
    }, [init])


    useEffect(() => {
        try {
            const fps = 1
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
                // TODO



                console.log("animate frame", requestAnimationRef.current);
            }

            const startAnimating = async (fps: number) => {
                msPerFrame = 1000 / fps
                msPrev = window.performance.now()
                await animate()
                console.debug('start animation')
            }
            startAnimating(fps)
        } catch (error) {
            console.error(error)
            cancelAnimationFrame(requestAnimationRef.current)
        }

        // Limpia la animación cuando el componente se desmonta
        return () => {
            console.log(`delete AnimationFrame(${requestAnimationRef.current});`)
            cancelAnimationFrame(requestAnimationRef.current)
        }
    }, [])

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

            <br />

            <button type="button" onClick={info}>Info</button>

            <DevicesInfo onDeviceChange={onDeviceChange} />
        </>
    )
}