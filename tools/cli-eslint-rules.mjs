import react from 'eslint-plugin-react';

export const componentRules = {
  plugins: { react },
  settings: { react: { version: '19.0' } },
  rules: { 'react/no-multi-comp': ['error', { ignoreStateless: false }] },
};

export const businessRules = {
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        selector:
          ':matches(ImportDeclaration, ExportNamedDeclaration, ExportAllDeclaration)[source.value=/CLI|@quark.ui/]',
        message:
          'Business modules must not import or re-export CLI presentation.',
      },
      {
        selector: 'ImportExpression[source.value=/CLI|@quark.ui/]',
        message: 'Business modules must not load CLI presentation.',
      },
      {
        selector:
          'CallExpression[callee.name="require"] > Literal[value=/CLI|@quark.ui/]',
        message: 'Business modules must not load CLI presentation.',
      },
    ],
  },
};
