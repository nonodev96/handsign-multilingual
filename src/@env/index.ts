import { createBrowserEnv } from './createBrowserEnv';
import { createNodejsEnv } from './createNodejsEnv';
import { isBrowser } from './isBrowser';
import { isNodejs } from './isNodejs';
import type { Environment } from './types';

let environment: Environment | null

function initialize() {
    // check for isBrowser() first to prevent electron renderer process
    // to be initialized with wrong environment due to isNodejs() returning true
    if (isBrowser()) {
        return setEnv(createBrowserEnv())
    }
    if (isNodejs()) {
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