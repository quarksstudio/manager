const workspaceMappings = require('../../tools/jest-workspace-mappings.cjs');
module.exports = {
  displayName: 'config',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'html'],
  moduleNameMapper: {
    ...workspaceMappings,

    '^@quarks.studio/config/hooks$': '<rootDir>/src/hooks/index.ts',
    '^@quarks.studio/logger$': '<rootDir>/../installer/logger/src/index.ts',
  },
  coverageDirectory: '../../coverage/packages/config',
};
