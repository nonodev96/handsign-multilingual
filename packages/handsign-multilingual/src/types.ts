import type { GestureDescription } from "fingerpose";

export type HandSignLang = {
    signImage?: {
        [name: string]: string
    }

    signPass?: {
        src: string;
        alt: string;
    }[]

    signs: {
        [name: string]: GestureDescription
    }
}

export interface Keypoint3D {
    x: number;
    y: number;
    z: number;
}

export type Environment = {
    Canvas: typeof HTMLCanvasElement;
    CanvasRenderingContext2D: typeof CanvasRenderingContext2D;
    Image: typeof HTMLImageElement;
    ImageData: typeof ImageData;
    Video: typeof HTMLVideoElement;
    fetch: typeof fetch;
    createCanvasElement: () => HTMLCanvasElement;
    createImageElement: () => HTMLImageElement;
}