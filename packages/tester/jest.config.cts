module.exports = {
  displayName: 'tester',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js'],
  moduleNameMapper: {
    '^@quark/ui/CLI$': '<rootDir>/../ui/src/CLI/index.ts',
  },
  coverageDirectory: '../../coverage/packages/tester',
};
