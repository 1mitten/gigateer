export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  testTimeout: 60000,
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', { 
      useESM: true,
      isolatedModules: true
    }],
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/cli.ts', // CLI entry point
    '!src/index.ts', // Main entry point
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75,
    },
  },
  // Handle ES modules
  transformIgnorePatterns: [
    'node_modules/(?!(@gigateer/contracts|.*\\.mjs$))'
  ],
  moduleNameMapper: {
    '^@gigateer/contracts$': '<rootDir>/../../packages/contracts/src/index.ts',
  },
};