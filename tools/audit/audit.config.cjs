const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('../../tsconfig.base.json');

module.exports = {
  rootDir: '../..',
  displayName: 'audit-manager',
  testEnvironment: 'node',
  modulePathIgnorePatterns: [
    '<rootDir>/dist/',
    '<rootDir>/.nx/',
    '<rootDir>/tmp/',
  ],
  testMatch: ['<rootDir>/tools/audit/**/*.spec.ts'],
  moduleNameMapper: pathsToModuleNameMapper(
    Object.fromEntries(
      Object.entries(compilerOptions.paths).filter(([name]) => name !== 'ink'),
    ),
    { prefix: '<rootDir>/' },
  ),
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          ...compilerOptions,
          module: 'commonjs',
          target: 'es2022',
          esModuleInterop: true,
          isolatedModules: true,
        },
      },
    ],
  },
  testTimeout: 15000,
};
