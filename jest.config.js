export default {
  testEnvironment: 'node',
  collectCoverageFrom: [
    'server.js',
    'js/**/*.js'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};


