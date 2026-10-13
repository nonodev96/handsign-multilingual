import { defineConfig } from 'tsup'

export default defineConfig({
  format: ['cjs', 'esm'],
  entry: ['./src/index.ts', './src/images.ts', './src/samples.ts'],
  dts: true,
  skipNodeModulesBundle: true,
  clean: true,
  platform: 'browser',
  outDir: 'dist',
  sourcemap: true,
  loader: {
    '.svg': 'dataurl'
  }
})
