module.exports = {
  moduleNameMapper: {
    '^sanitize-html$': require.resolve('sanitize-html', { paths: [__dirname] }),
    '^@quarks.studio/registry/client$': '<rootDir>/../registry/src/client.ts',
  },
  displayName: 'cli-ui',
  preset: '../../jest.preset.js',
  testEnvironment: 'jsdom',
  transform: {
    '^(?!.*\\.(js|jsx|ts|tsx|css|json)$)': '@nx/react/plugins/jest',
    '^.+\\.[tj]sx?$': ['babel-jest', { presets: ['@nx/react/babel'] }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: '../../coverage/packages/ui',
};
