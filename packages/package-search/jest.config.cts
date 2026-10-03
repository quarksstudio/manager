const workspaceMappings = require('../../tools/jest-workspace-mappings.cjs');
module.exports = {
  testPathIgnorePatterns: ['/node_modules/', '/test/web/'],
  displayName: 'package-search',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'html'],
  moduleNameMapper: {
    ...workspaceMappings,
    '^@quarks.studio/config$': '<rootDir>/../config/src/index.ts',
    '^@quarks.studio/config/hooks$': '<rootDir>/../config/src/hooks/index.ts',
    '^@quarks.studio/logger$': '<rootDir>/../installer/logger/src/index.ts',
  },
  coverageDirectory: '../../coverage/packages/package-search',
};
