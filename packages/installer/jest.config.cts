module.exports = {
  displayName: 'installer',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'html'],
  moduleNameMapper: {
    '^@quarks.studio/ui/CLI$': '<rootDir>/../ui/src/CLI/index.ts',

    '^@quarks.studio/registry$': '<rootDir>/../registry/src/index.ts',
    '^@quarks.studio/manifest$': '<rootDir>/../manifest/src/index.ts',
    '^@quarks.studio/local-store$': '<rootDir>/../local-store/src/index.ts',
    '^@quarks.studio/permissions$': '<rootDir>/../permissions/src/index.ts',
    '^@quarks.studio/types$': '<rootDir>/../types/src/index.ts',
    '^@quarks.studio/use-storage$': '<rootDir>/../use-storage/src/index.ts',
    '^@quarks.studio/targz$': '<rootDir>/../targz/src/index.ts',
  },
  coverageDirectory: '../../coverage/packages/installer',
};
