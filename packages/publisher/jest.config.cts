module.exports = {
  displayName: 'publisher',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js'],
  moduleNameMapper: {
    '^@quarks.studio/ui/CLI$': '<rootDir>/../ui/src/CLI/index.ts',

    '^@quarks.studio/registry/upload$':
      '<rootDir>/../registry/src/infrastructure/upload-package-archive.ts',
    '^@quarks.studio/tester$': '<rootDir>/../tester/src/index.ts',
    '^@quarks.studio/targz$': '<rootDir>/../targz/src/index.ts',
    '^@quarks.studio/registry$': '<rootDir>/../registry/src/index.ts',
  },
  coverageDirectory: '../../coverage/packages/publisher',
};
