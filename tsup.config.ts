import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { defineConfig } from 'tsup';

export default defineConfig({
    format: ['cjs', 'esm'],
    entry: ['./src/index.ts'],
    dts: true,
    shims: true,
    skipNodeModulesBundle: true,
    clean: true,
    platform: 'browser',
    sourcemap: true,
    // minify: true,
    loader: {
        '.svg': 'file',
    }
});
