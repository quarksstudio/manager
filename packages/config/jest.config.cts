module.exports = {
  displayName: 'config',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'html'],
  moduleNameMapper: {
    '^@quarks.studio/ui/CLI$': '<rootDir>/../ui/src/CLI/index.ts',

    '^@quarks.studio/use-storage$': '<rootDir>/../use-storage/src/index.ts',
    '^@quarks.studio/types$': '<rootDir>/../types/src/index.ts',
  },
  coverageDirectory: '../../coverage/packages/config',
};
