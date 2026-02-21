module.exports = {
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/test/'],
};
