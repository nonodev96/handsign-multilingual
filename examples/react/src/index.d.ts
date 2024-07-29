
export interface Keypoint3D {
    x: number;
    y: number;
    z: number;
}

export interface GestureEstimate {
    name: string;
    score: number;
}


export type PosDataArray = Array<[name: string, curl: string, direction: string]>;