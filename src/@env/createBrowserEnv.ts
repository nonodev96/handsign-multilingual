import type { Environment } from './types';

export function createBrowserEnv(): Environment {

    const fetch = () => {
        const fetch = global.fetch
        if (fetch) {
            return fetch
        }
        throw new Error('fetch - missing fetch implementation for nodejs environment')
    }

    const readFile = () => {
        throw new Error('readFile - filesystem not available for browser environment')
    }

    return {
        Canvas: HTMLCanvasElement,
        CanvasRenderingContext2D: CanvasRenderingContext2D,
        Image: HTMLImageElement,
        ImageData: ImageData,
        Video: HTMLVideoElement,
        createCanvasElement: () => document.createElement('canvas'),
        createImageElement: () => document.createElement('img'),
        fetch,
        readFile
    }
}