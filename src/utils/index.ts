export function createImageElement() {
    const Image = global.Image || global.HTMLImageElement

    if (Image) {
        return new Image()
    }
    throw new Error('createImageElement - missing Image implementation for nodejs environment')
}

export function fetch() {
    const fetch = global.fetch
    if (fetch) {
        return fetch
    }
    throw new Error('fetch - missing fetch implementation for nodejs environment')
}