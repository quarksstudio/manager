const workspaceMappings = require('../../tools/jest-workspace-mappings.cjs');
module.exports = {
  testPathIgnorePatterns: ['/node_modules/', '/test/web/'],
  displayName: 'distribution',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'html'],
  moduleNameMapper: {
    ...workspaceMappings,
    '^@quarks.studio/config$': '<rootDir>/../config/src/index.ts',
    '^@quarks.studio/config/hooks$': '<rootDir>/../config/src/hooks.ts',
    '^@quarks.studio/logger$': '<rootDir>/../logger/src/index.ts',
    '^@quarks.studio/types$': '<rootDir>/../types/src/index.ts',
    '^@quarks.studio/types/(.*)$': '<rootDir>/../types/src/$1',
    '^@quarks.studio/use-storage$': '<rootDir>/../use-storage/src/index.ts',
    '^@quarks.studio/use-storage/storage$':
      '<rootDir>/../use-storage/src/storage.ts',
    '^@quarks.studio/ui/CLI$': '<rootDir>/../ui/src/CLI/index.ts',
  },
  coverageDirectory: '../../coverage/packages/distribution',
};
