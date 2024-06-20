// import { createFileSystem } from './createFileSystem';
import type { Environment } from '#/__types__';

export function createNodejsEnv(): Environment {

    const Canvas = global.Canvas || global.HTMLCanvasElement
    const Image = global.Image || global.HTMLImageElement

    function createCanvasElement() {
        if (Canvas) {
            return new Canvas()
        }
        throw new Error('createCanvasElement - missing Canvas implementation for nodejs environment')
    }

    function createImageElement() {
        if (Image) {
            return new Image()
        }
        throw new Error('createImageElement - missing Image implementation for nodejs environment')
    }

    function fetch() {
        const fetch = global.fetch
        return fetch
    }
    //   const fileSystem = createFileSystem()

    return {
        Canvas: Canvas,
        CanvasRenderingContext2D: global.CanvasRenderingContext2D,
        Image: Image,
        ImageData: global.ImageData,
        Video: global.HTMLVideoElement,
        createCanvasElement,
        createImageElement,
        fetch: global.fetch
        // ...fileSystem
    }
}