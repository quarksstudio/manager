module.exports = {
  displayName: 'installer',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'html'],
  moduleNameMapper: {
    '^@quark/ui/CLI$': '<rootDir>/../ui/src/CLI/index.ts',

    '^@quark/registry$': '<rootDir>/../registry/src/index.ts',
    '^@quark/manifest$': '<rootDir>/../manifest/src/index.ts',
    '^@quark/local-store$': '<rootDir>/../local-store/src/index.ts',
    '^@quark/permissions$': '<rootDir>/../permissions/src/index.ts',
    '^@quark/types$': '<rootDir>/../types/src/index.ts',
    '^@quark/use-storage$': '<rootDir>/../use-storage/src/index.ts',
    '^@quark/targz$': '<rootDir>/../targz/src/index.ts',
  },
  coverageDirectory: '../../coverage/packages/installer',
};
