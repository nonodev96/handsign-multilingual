import type { Environment } from '#/__types__';

export function createBrowserEnv(): Environment {

    function _fetch() {
        const fetch = window.fetch
        if (fetch) {
            return fetch
        }
        throw new Error('fetch - missing fetch implementation for nodejs environment')
    }

    function _readFile() {
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
        fetch: _fetch
        // readFile: _readFile
    }
}