module.exports = {
  testEnvironment: 'node',
  setupFiles: ['dotenv/config'],
  transform: {},
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/index.js',
    '!src/server.js',
    '!src/config/**'
  ],
  coveragePathIgnorePatterns: ['/node_modules/'],
  verbose: true,
  maxWorkers: 1,
  forceExit: true,
  testTimeout: 30000,
  globals: {
    NODE_ENV: 'test'
  }
};
