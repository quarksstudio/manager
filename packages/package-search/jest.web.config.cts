const workspaceMappings = require('../../tools/jest-workspace-mappings.cjs');
module.exports = {
  moduleNameMapper: {
    ...workspaceMappings,
  },
  displayName: 'package-search-web',
  preset: '../../jest.preset.js',
  testEnvironment: 'jsdom',
  testMatch: ['<rootDir>/test/web/**/*.spec.[jt]s?(x)'],
  setupFiles: ['<rootDir>/../../tools/test/react-setup.ts'],
  transformIgnorePatterns: [
    '/node_modules/(?!(\\.pnpm|@ant-design/|@rc-component/|rc-|antd/))',
  ],
  transform: {
    '^(?!.*\\.(js|jsx|ts|tsx|css|json)$)': '@nx/react/plugins/jest',
    '^.+\\.[tj]sx?$': ['babel-jest', { presets: ['@nx/react/babel'] }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: '../../coverage/packages/package-search-web',
};
