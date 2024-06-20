import * as fs from 'node:fs';
import * as path from 'node:path';
import type { TestEnv } from "../types"

const canvas = global.Canvas

async function loadImageNode(uri: string): Promise<HTMLImageElement> {
    return canvas.loadImage(path.resolve(__dirname, '../', uri))
}
async function loadJsonNode<T>(uri: string): Promise<T> {
    return JSON.parse(fs.readFileSync(path.resolve(__dirname, '../', uri)).toString())
}

const TestEnvNode: TestEnv = {
    loadImage: loadImageNode,
    loadJson: loadJsonNode
}

export function getTestEnv(): TestEnv {
    return global.nodeTestEnv || TestEnvNode
}