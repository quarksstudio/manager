module.exports = {
  displayName: 'publisher',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js'],
  moduleNameMapper: {
    '^@quark/ui/CLI$': '<rootDir>/../ui/src/CLI/index.ts',

    '^@quark/registry/upload$':
      '<rootDir>/../registry/src/infrastructure/upload-package-archive.ts',
    '^@quark/tester$': '<rootDir>/../tester/src/index.ts',
    '^@quark/targz$': '<rootDir>/../targz/src/index.ts',
    '^@quark/registry$': '<rootDir>/../registry/src/index.ts',
  },
  coverageDirectory: '../../coverage/packages/publisher',
};
