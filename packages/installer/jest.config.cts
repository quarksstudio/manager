const workspaceMappings = require('../../tools/jest-workspace-mappings.cjs');
module.exports = {
  displayName: 'installer',
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

    '^@quarks.studio/registry$': '<rootDir>/../registry/src/index.ts',
    '^@quarks.studio/manifest$': '<rootDir>/../manifest/src/index.ts',
    '^@quarks.studio/permissions$': '<rootDir>/../permissions/src/index.ts',
    '^@quarks.studio/targz$': '<rootDir>/../targz/src/index.ts',
  },
  coverageDirectory: '../../coverage/packages/installer',
};
