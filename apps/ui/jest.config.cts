const viteMetaEnvPlugin = ({ types: t }) => ({
  visitor: {
    MetaProperty(path) {
      if (
        path.node.meta?.name === 'import' &&
        path.node.property?.name === 'meta'
      ) {
        path.replaceWith(
          t.objectExpression([
            t.objectProperty(
              t.identifier('env'),
              t.memberExpression(t.identifier('process'), t.identifier('env')),
            ),
          ]),
        );
      }
    },
  },
});

module.exports = {
  displayName: 'ui',
  preset: '../../jest.preset.js',
  transform: {
    '^(?!.*\\.(js|jsx|ts|tsx|css|json)$)': '@nx/react/plugins/jest',
    '^.+\\.[tj]sx?$': [
      'babel-jest',
      { presets: ['@nx/react/babel'], plugins: [viteMetaEnvPlugin] },
    ],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: '../../coverage/apps/ui',
};
