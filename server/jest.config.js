/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.js"],
  testTimeout: 10000,
  clearMocks: true,           // Reset mock state between every test
  restoreMocks: true,         // Restore jest.spyOn after every test
  coverageDirectory: "coverage",
  collectCoverageFrom: [
    "controllers/**/*.js",
    "!controllers/adminController.js",  // large, covered separately
  ],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
