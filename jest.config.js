module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/server/__tests__'],
  collectCoverageFrom: ['server/**/*.js'],
  coveragePathIgnorePatterns: ['/node_modules/', '/server/scripts/', '/server/index.js'],
  clearMocks: true
};


