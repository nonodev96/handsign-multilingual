import { defineConfig } from 'tsup';

export default defineConfig({
    format: ['cjs', 'esm'],
    entry: ['./src/index.ts'],
    dts: true,
    shims: true,
    skipNodeModulesBundle: true,
    clean: true,
    platform: 'browser',
    outDir: "../../dist",
    sourcemap: true,
    // minify: true,
    loader: {
        '.svg': 'file',
    }
});
