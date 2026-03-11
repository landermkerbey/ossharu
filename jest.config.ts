import type { Config } from 'jest';

const config: Config = {
  projects: [
    {
      displayName: 'unit',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testPathIgnorePatterns: ['/node_modules/', '\\.integration\\.test\\.ts$'],
    },
    {
      displayName: 'integration',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['**/*.integration.test.ts'],
    },
  ],
};

export default config;