import { fetchImage, fetchJson } from '#/utils';
import type { TestEnv } from "../types"

async function loadImageBrowser(uri: string): Promise<HTMLImageElement> {
    return fetchImage(`base${uri.startsWith('/') ? '' : '/'}${uri}`)
}
async function loadJsonBrowser<T>(uri: string): Promise<T> {
    return fetchJson<T>(`base${uri.startsWith('/') ? '' : '/'}${uri}`)
}

const TestEnvDom: TestEnv = {
    loadImage: loadImageBrowser,
    loadJson: loadJsonBrowser
}

export function getTestEnv(): TestEnv {
    return global.TestEnvDom || TestEnvDom
}