const workspaceMappings = require('../../tools/jest-workspace-mappings.cjs');
module.exports = {
  moduleNameMapper: workspaceMappings,
  displayName: 'runtime',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/packages/runtime',
};
