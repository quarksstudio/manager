module.exports = {
  displayName: 'config',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'html'],
  moduleNameMapper: {
    '^@quark/ui/CLI$': '<rootDir>/../ui/src/CLI/index.ts',

    '^@quark/use-storage$': '<rootDir>/../use-storage/src/index.ts',
    '^@quark/types$': '<rootDir>/../types/src/index.ts',
  },
  coverageDirectory: '../../coverage/packages/config',
};
