module.exports = {
  displayName: 'registry',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'html'],
  moduleNameMapper: {
    '^@quark/ui/CLI$': '<rootDir>/../ui/src/CLI/index.ts',
  },
  coverageDirectory: '../../coverage/packages/registry',
};
