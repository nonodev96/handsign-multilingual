import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import basicSsl from '@vitejs/plugin-basic-ssl'
import react from '@vitejs/plugin-react'
import { type Plugin, defineConfig } from 'vite'

/** Where the recordings of the demo go, to measure the recognition and build ready-made samples (pnpm evaluate) */
const RECORDINGS = fileURLToPath(new URL('../../packages/handsign-multilingual/data/recordings', import.meta.url))
const MAX_BYTES = 20 * 1024 * 1024

type Recording = { language: 'ASL' | 'SSL'; person?: string; samples: unknown[] }

const isPoints = (points: unknown, size: number) =>
  Array.isArray(points) &&
  points.length === 21 &&
  points.every((point) => Array.isArray(point) && point.length === size && point.every((value) => Number.isFinite(value)))

// The file the demo sends (exportRecordings): checked field by field, so that nothing else can be written
function check(data: unknown): Recording {
  const recording = data as Recording
  if (recording?.language !== 'ASL' && recording?.language !== 'SSL') throw new Error('language')
  if (!Array.isArray(recording.samples) || recording.samples.length === 0) throw new Error('samples')
  if (recording.person !== undefined && typeof recording.person !== 'string') throw new Error('person')
  for (const sample of recording.samples as Array<Record<string, unknown>>) {
    if (typeof sample.letter !== 'string' || !/^[A-ZÑ]{1,2}$/.test(sample.letter)) throw new Error('letter')
    if (!isPoints(sample.landmarks, 3)) throw new Error('landmarks')
    if (sample.world !== undefined && !isPoints(sample.world, 3)) throw new Error('world')
  }
  return recording
}

/**
 * Only with the development server: POST …/__handsign/recordings saves the recordings of the demo in
 * packages/handsign-multilingual/data/recordings/<language>-<person>.json (each time, all of them: it replaces the file)
 */
function saveRecordings(): Plugin {
  return {
    name: 'handsign-save-recordings',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.method !== 'POST' || !request.url?.endsWith('/__handsign/recordings')) return next()
        const chunks: Buffer[] = []
        let size = 0
        const reply = (status: number, body: object) => {
          response.statusCode = status
          response.setHeader('content-type', 'application/json')
          response.end(JSON.stringify(body))
        }
        request.on('data', (chunk: Buffer) => {
          size += chunk.length
          if (size > MAX_BYTES) {
            reply(413, { error: 'too big' })
            request.destroy()
          } else chunks.push(chunk)
        })
        request.on('end', () => {
          if (response.writableEnded) return
          try {
            const recording = check(JSON.parse(Buffer.concat(chunks).toString('utf8')))
            const person =
              (recording.person ?? 'anonymous')
                .toLowerCase()
                .normalize('NFD')
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '')
                .slice(0, 40) || 'anonymous'
            const file = `${recording.language.toLowerCase()}-${person}.json`
            mkdirSync(RECORDINGS, { recursive: true })
            writeFileSync(join(RECORDINGS, file), `${JSON.stringify(recording)}\n`)
            reply(200, { file: `packages/handsign-multilingual/data/recordings/${file}`, samples: recording.samples.length })
          } catch (error) {
            reply(400, { error: error instanceof Error ? error.message : String(error) })
          }
        })
      })
    }
  }
}

/**
 * Only in the build: @mediapipe/hands is a Closure bundle, `(function () { … }).call(this)`, that publishes its API
 * (Hands, HAND_CONNECTIONS, VERSION) on that `this`. Rollup cannot see those exports, so the module came out empty and
 * `new Hands()` failed (the development server, with esbuild, gets it right: there `this` is `exports`). This turns it
 * into an ES module that runs the code on an object of its own, as esbuild does, and exports what it publishes there
 */
function mediapipeHandsExports(): Plugin {
  const CALL = /\}\)\.call\(this\);\s*$/
  return {
    name: 'handsign-mediapipe-hands-exports',
    apply: 'build',
    transform(code, id) {
      if (!/[\\/]@mediapipe[\\/]hands[\\/]hands\.js$/.test(id)) return null
      if (!CALL.test(code)) this.error('@mediapipe/hands/hands.js no longer ends in "}).call(this);": review this plugin')
      return {
        code: [
          'const mediapipeHands = {};',
          code.replace(CALL, '}).call(mediapipeHands);'),
          'export const { Hands, HAND_CONNECTIONS, VERSION } = mediapipeHands;'
        ].join('\n'),
        map: null
      }
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // The demo lives under /handsign-multilingual/ (GitHub Pages); the router uses the same basename
  base: '/handsign-multilingual/',
  // `vite --mode https` (pnpm dev:https): a development certificate, so the camera also works from other devices
  // (browsers only allow it on HTTPS or localhost)
  plugins: [react(), saveRecordings(), mediapipeHandsExports(), ...(mode === 'https' ? [basicSsl()] : [])]
}))
