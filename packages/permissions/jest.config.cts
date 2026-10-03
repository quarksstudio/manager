const workspaceMappings = require('../../tools/jest-workspace-mappings.cjs');
module.exports = {
  moduleNameMapper: workspaceMappings,
  displayName: 'permissions',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/packages/permissions',
};
