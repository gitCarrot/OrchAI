module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: ['**/__tests__/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
  detectOpenHandles: true,
  forceExit: true,
  testTimeout: 30000,
  verbose: true,
}; 