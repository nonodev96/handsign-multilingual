import { useCallback, useEffect, useState } from "react";
import styles from './DevicesInfo.module.css'

interface DevicesInfoProps {
    onDeviceChange: (mediaDeviceInfo: MediaDeviceInfo) => void
}

export default function DevicesInfo({ onDeviceChange }: DevicesInfoProps) {
    // const [deviceId, setDeviceId] = useState({});
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

    const handleDevices = useCallback((mediaDevices: MediaDeviceInfo[]) => {
        return setDevices(mediaDevices.filter(({ kind }) => kind === "videoinput"))
    }, []);

    useEffect(() => {
        navigator.mediaDevices.enumerateDevices().then((mediaDevices) => {
            handleDevices(mediaDevices)
        })
    }, [handleDevices])

    return <>
        <ol className={styles.left}>
            {devices.map((device: MediaDeviceInfo, index: number) => (
                <li key={device.deviceId}>
                    {device.label || `Device ${index + 1}`}

                    <button type="button" onClick={() => onDeviceChange(device)}>Select</button>
                </li>
            ))}
        </ol>
    </>
}