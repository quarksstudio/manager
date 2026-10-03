const workspaceMappings = require('../../tools/jest-workspace-mappings.cjs');
module.exports = {
  displayName: 'tester',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js'],
  moduleNameMapper: {
    ...workspaceMappings,
    '^@quarks.studio/config$': '<rootDir>/../config/src/index.ts',
    '^@quarks.studio/config/hooks$': '<rootDir>/../config/src/hooks.ts',
    '^@quarks.studio/logger$': '<rootDir>/../logger/src/index.ts',
    '^@quarks.studio/use-storage$': '<rootDir>/../use-storage/src/index.ts',
    '^@quarks.studio/use-storage/storage$': '<rootDir>/../use-storage/src/storage.ts',
    '^@quarks.studio/ui/CLI$': '<rootDir>/../ui/src/CLI/index.ts',
  },
  coverageDirectory: '../../coverage/packages/tester',
};
