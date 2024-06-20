import type { GestureDescription } from "fingerpose";

export type HandSignLang = {
    signImage: {
        [name: string]: string
    }

    signPass: {
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        src: any;
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

export type FileSystem = {
    readFile: (filePath: string) => Promise<Buffer>
}

export type Environment = {
    Canvas: typeof HTMLCanvasElement;
    CanvasRenderingContext2D: typeof CanvasRenderingContext2D;
    Image: typeof HTMLImageElement;
    ImageData: typeof ImageData;
    Video: typeof HTMLVideoElement;
    createCanvasElement: () => HTMLCanvasElement;
    createImageElement: () => HTMLImageElement;
    fetch: typeof fetch;

    // readFile: (filePath: string) => Promise<Buffer>
}