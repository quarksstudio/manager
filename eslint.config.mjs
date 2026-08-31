import nx from '@nx/eslint-plugin';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: ['**/dist', '**/out-tsc', '**/vite.config.*.timestamp*'],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          depConstraints: [
            {
              sourceTag: 'type:app',
              onlyDependOnLibsWithTags: [
                'type:presentation',
                'type:context',
                'type:adapter',
                'type:contract',
              ],
            },
            {
              sourceTag: 'type:presentation',
              onlyDependOnLibsWithTags: [
                'type:presentation',
                'type:context',
                'type:adapter',
                'type:contract',
              ],
            },
            {
              sourceTag: 'type:context',
              onlyDependOnLibsWithTags: [
                'type:context',
                'type:adapter',
                'type:contract',
              ],
            },
            {
              sourceTag: 'type:adapter',
              onlyDependOnLibsWithTags: [
                'type:context',
                'type:adapter',
                'type:contract',
              ],
            },
            {
              sourceTag: 'type:contract',
              onlyDependOnLibsWithTags: ['type:contract'],
            },
            { sourceTag: '*', onlyDependOnLibsWithTags: ['*'] },
          ],
        },
      ],
    },
  },
  {
    files: ['packages/*/src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            '@nestjs/*',
            '@google-cloud/*',
            'react',
            'ink',
            'tar',
            'fs',
            'fs/*',
            'child_process',
            '../infrastructure/*',
            '../application/*',
          ],
        },
      ],
    },
  },
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.jsx',
      '**/*.cjs',
      '**/*.mjs',
    ],
    rules: {},
  },
];
