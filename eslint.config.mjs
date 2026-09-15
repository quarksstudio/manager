import nx from '@nx/eslint-plugin';
import { componentRules, businessRules } from './tools/cli-eslint-rules.mjs';

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
          ignoredCircularDependencies: [['cli-ui', 'registry']],
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
                'type:presentation',
                'type:context',
                'type:adapter',
                'type:contract',
              ],
            },
            {
              sourceTag: 'type:adapter',
              onlyDependOnLibsWithTags: [
                'type:presentation',
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
  {
    files: ['packages/*/src/CLI/**/*.{ts,tsx}'],
    ignores: ['**/*.spec.ts', '**/*.spec.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            'fs',
            'fs/*',
            'node:fs',
            'node:fs/*',
            'http',
            'https',
            'node:http',
            'node:https',
            'child_process',
            'node:child_process',
            '@quarks.studio/targz',
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        {
          name: 'fetch',
          message:
            'Transport belongs in a library adapter, not CLI presentation.',
        },
      ],
    },
  },
  {
    files: ['packages/publisher/src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            'react',
            'react/*',
            'ink',
            'ink/*',
            'node:*',
            'fs',
            'fs/*',
            'http',
            'https',
            '@quarks.studio/registry',
            '@quarks.studio/targz',
            '**/application/**',
            '**/infrastructure/**',
          ],
        },
      ],
      'no-restricted-globals': ['error', 'fetch', 'process'],
    },
  },
  {
    files: ['packages/{publisher,tester}/src/application/**/*.ts'],
    ignores: ['**/*.spec.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            'react',
            'react/*',
            'ink',
            'ink/*',
            'node:*',
            'fs',
            'fs/*',
            '**/infrastructure/**',
          ],
        },
      ],
      'no-restricted-globals': ['error', 'fetch', 'process'],
    },
  },
  {
    files: ['packages/*/src/CLI/**/*.{ts,tsx}'],
    ignores: ['**/*.spec.ts', '**/*.spec.tsx', '**/*.test.ts', '**/*.test.tsx'],
    ...componentRules,
  },
  {
    files: ['packages/*/src/**/*.{ts,tsx}'],
    ignores: [
      'packages/*/src/CLI/**',
      'packages/ui/**',
      '**/*.spec.ts',
      '**/*.spec.tsx',
      '**/*.test.ts',
      '**/*.test.tsx',
    ],
    ...businessRules,
  },
  {
    files: ['packages/ui/src/CLI/**/*.{ts,tsx}'],
    ignores: ['**/*.spec.ts', '**/*.spec.tsx', '**/*.test.ts', '**/*.test.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            '@quarks.studio/*',
            '../web',
            '../web/**',
            '../../web',
            '../../web/**',
            '../../../web',
            '../../../web/**',
            '../hooks',
            '../hooks/**',
          ],
        },
      ],
    },
  },
  {
    files: [
      'packages/ui/src/hooks/**/*.{ts,tsx}',
      'packages/ui/src/lib/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            'ink',
            'ink/*',
            '@quarks.studio/registry/CLI',
            '@quarks.studio/registry/CLI/**',
            '../CLI',
            '../CLI/**',
            '../../CLI',
            '../../CLI/**',
          ],
        },
      ],
    },
  },
  {
    files: ['packages/ui/src/web/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            '@quarks.studio/registry/CLI',
            '@quarks.studio/registry/CLI/**',
            '@quarks.studio/types',
            '@quarks.studio/types/**',
            '@quarks.studio/targz',
            '@quarks.studio/targz/**',
            '@quarks.studio/publisher',
            '@quarks.studio/publisher/**',
            '@quarks.studio/tester',
            '@quarks.studio/tester/**',
            '../CLI',
            '../CLI/**',
            '../../CLI',
            '../../CLI/**',
            '../../../CLI',
            '../../../CLI/**',
          ],
        },
      ],
    },
  },
];
