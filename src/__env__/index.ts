import { createBrowserEnv } from '#/__env__/createBrowserEnv';
import { createNodejsEnv } from '#/__env__/createNodejsEnv';
import { isBrowser } from '#/__env__/isBrowser';
import { isNodejs } from '#/__env__/isNodejs';
import type { Environment } from '#/__types__';

let environment: Environment | null

function initialize() {
    // check for isBrowser() first to prevent electron renderer process
    // to be initialized with wrong environment due to isNodejs() returning true
    if (isBrowser()) {
        console.log("isBrowser")
        return setEnv(createBrowserEnv())
    }
    if (isNodejs()) {
        console.log("isNodejs")
        return setEnv(createNodejsEnv())
    }
}

function getEnv(): Environment {
    if (!environment) {
        throw new Error('getEnv - environment is not defined, check isNodejs() and isBrowser()')
    }
    return environment
}

function setEnv(env: Environment) {
    environment = env
}

initialize()

export { getEnv }