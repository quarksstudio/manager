const workspaceMappings = require('../../tools/jest-workspace-mappings.cjs');
module.exports = {
  displayName: 'publisher',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js'],
  moduleNameMapper: {
    ...workspaceMappings,
    '^@quarks.studio/ui/CLI$': '<rootDir>/../ui/src/CLI/index.ts',
    '^@quarks.studio/config$': '<rootDir>/../config/src/index.ts',
    '^@quarks.studio/config/hooks$': '<rootDir>/../config/src/hooks.ts',
    '^@quarks.studio/logger$': '<rootDir>/../logger/src/index.ts',

    '^@quarks.studio/tester$': '<rootDir>/../tester/src/index.ts',
    '^@quarks.studio/targz$': '<rootDir>/../targz/src/index.ts',
  },
  coverageDirectory: '../../coverage/packages/publisher',
};
