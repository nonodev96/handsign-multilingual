import { useCallback, useEffect, useState } from "react";

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
        <ol>
            {devices.map((device: MediaDeviceInfo, index: number) => (
                <li key={device.deviceId}
                    className="mb-2">
                    <button type="button"
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-4 rounded"
                        onClick={() => onDeviceChange(device)}>Select</button>
                    <span className="ms-2">
                        {device.label || `Device ${index + 1}`}
                    </span>
                </li>
            ))}
        </ol>
    </>
}