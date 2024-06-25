import type * as handPoseDetection from '@tensorflow-models/hand-pose-detection'

const FINGER_JOINTS = {
    thumb: [0, 1, 2, 3, 4],
    index: [0, 5, 6, 7, 8],
    mid: [0, 9, 10, 11, 12],
    ring: [0, 13, 14, 15, 16],
    pinky: [0, 17, 18, 19, 20]
}

const _drawFinger = (ctx: CanvasRenderingContext2D, keypoints: handPoseDetection.Keypoint[]) => {
    const landmarks = keypoints.map(({ x, y }) => [x, y])
    const fingerNames = Object.keys(FINGER_JOINTS) as (keyof typeof FINGER_JOINTS)[]

    for (const finger of fingerNames) {
        const joints = FINGER_JOINTS[finger]
        for (let k = 0; k < joints.length - 1; k++) {
            const firstJointIndex = joints[k]
            const secondJointIndex = joints[k + 1]
            // Dibuja las articulaciones
            ctx.beginPath()
            ctx.moveTo(
                landmarks[firstJointIndex][0],
                landmarks[firstJointIndex][1]
            )
            ctx.lineTo(
                landmarks[secondJointIndex][0],
                landmarks[secondJointIndex][1]
            )
            ctx.strokeStyle = 'gold'
            ctx.lineWidth = 2
            ctx.stroke()
        }
    }
    for (const [x, y] of landmarks) {
        _drawPoint(ctx, x, y)
    }
}

const _drawRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
    ctx.lineWidth = 3
    ctx.strokeStyle = 'rgba(0,255,21,0.84)'
    ctx.strokeRect(x, y, w, h)
}

const _drawTextBG = (ctx: CanvasRenderingContext2D, txt: string, x: number, y: number, padding: number, font = '16px Barlow-Regular, Roboto') => {
    ctx.font = font
    ctx.textBaseline = 'top'
    ctx.fillStyle = '#fff'

    const width = ctx.measureText(txt).width
    ctx.fillRect(x, y, width + padding, Number.parseInt(font, 10) + padding)

    ctx.lineWidth = 2
    ctx.strokeStyle = '#009ddf'
    ctx.strokeRect(x, y, width + padding, Number.parseInt(font, 10) + padding)

    ctx.fillStyle = '#009ddf'
    ctx.fillText(txt, x + padding / 2, y + padding / 2)
}

const _drawPoint = (ctx: CanvasRenderingContext2D, x: number, y: number, r = 3) => {
    ctx.beginPath()
    ctx.arc(x, y, r, 0, 2 * Math.PI)
    ctx.fill()
}

export {
    _drawFinger,
    _drawPoint,
    _drawRect,
    _drawTextBG,
}