module.exports = {
  displayName: 'actions',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  moduleNameMapper: {
    '^@quark/tester$': '<rootDir>/../tester/src/index.ts',
    '^@quark/registry$': '<rootDir>/../registry/src/index.ts',
    '^@quark/types$': '<rootDir>/../types/src/index.ts',
    '^@quark/use-storage$': '<rootDir>/../use-storage/src/index.ts',
    '^@quark/targz$': '<rootDir>/../targz/src/index.ts',
  },
  coverageDirectory: '../../coverage/packages/actions',
};
