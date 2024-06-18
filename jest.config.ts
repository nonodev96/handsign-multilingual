import type { Config } from "@jest/types"

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  verbose: true,
  transform: {
    "^.+\\.svg$": "<rootDir>/svgTransform.js"
  }
};

export default config