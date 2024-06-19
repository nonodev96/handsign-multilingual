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