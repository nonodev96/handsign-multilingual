// The images of the letters, apart from the main entry so they only weigh on apps that show them. They are inlined as
// data URLs: they work in any bundler, in Node and from a CDN, with no setup
export { images as SignImagesASL } from './asl/handimage'
export { images as SignImagesSSL } from './ssl/handimage'
export type { SignImage } from './types'
