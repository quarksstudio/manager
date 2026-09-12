import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from 'eslint';
import tseslint from 'typescript-eslint';

const flatConfig = (await import('../eslint.config.mjs')).default;

function matches(pattern, filePath) {
  if (pattern.includes('**')) {
    return filePath.startsWith(pattern.split('**')[0]);
  }
  if (pattern.includes('*')) {
    return new RegExp(
      `^${pattern.replace(/\./g, '\\.').replace(/\*/g, '.*')}$`,
    ).test(filePath);
  }
  return pattern === filePath;
}

function restrictedRuleFor(filePath) {
  const entry = flatConfig.find((config) => {
    if (!config.rules?.['no-restricted-imports']) return false;
    const files = config.files ?? ['**/*.{ts,tsx}'];
    return files.some((pattern) => matches(pattern, filePath));
  });
  assert.ok(entry, `No no-restricted-imports config applies to ${filePath}`);
  return entry.rules['no-restricted-imports'];
}

async function violations(code, filePath) {
  const rule = restrictedRuleFor(filePath);
  const linter = new Linter();
  const messages = linter.verify(
    code,
    [
      {
        files: ['**/*.{ts,tsx}'],
        languageOptions: {
          parser: tseslint.parser,
          parserOptions: { ecmaFeatures: { jsx: true } },
        },
        rules: { 'no-restricted-imports': rule },
      },
    ],
    { filename: filePath },
  );
  assert.ok(
    !messages.some((message) => message.fatal),
    JSON.stringify(messages),
  );
  return messages.filter(
    (message) => message.ruleId === 'no-restricted-imports',
  );
}

test('web presentation may import the registry and browser-storage libraries', async () => {
  for (const specifier of ['@quark/registry', '@quark/use-storage']) {
    assert.equal(
      (
        await violations(
          `import { x } from '${specifier}';`,
          'packages/ui/src/hooks/usePackageDetailsView.ts',
        )
      ).length,
      0,
      `expected ${specifier} to be allowed`,
    );
  }
});

test('web presentation cannot reach the registry CLI surface', async () => {
  for (const specifier of [
    '@quark/registry/CLI',
    '@quark/registry/CLI/search-action',
  ]) {
    assert.ok(
      (
        await violations(
          `import { x } from '${specifier}';`,
          'packages/ui/src/web/components/package-details/PackageDetails.tsx',
        )
      ).length > 0,
      `expected ${specifier} to be restricted`,
    );
  }
});

test('web presentation cannot import CLI components or other quark packages', async () => {
  for (const code of [
    "import { Screen } from '../CLI';",
    "import { renderAction } from '../../CLI';",
    "import { read } from '@quark/targz';",
    "import { sortVersions } from '@quark/registry/CLI';",
    "import { get } from '@quark/types';",
  ]) {
    assert.ok(
      (await violations(code, 'packages/ui/src/web/components/ui/button.tsx'))
        .length > 0,
    );
  }
});

test('CLI presentation cannot import web components', async () => {
  for (const code of [
    "import { PackageDetails } from '../web/components/package-details/PackageDetails';",
    "import { renderMarkdown } from '../web/lib/markdown';",
  ]) {
    assert.ok(
      (
        await violations(
          code,
          'packages/ui/src/CLI/components/layout/Panel.tsx',
        )
      ).length > 0,
    );
  }
});

test('CLI presentation cannot import any @quark/* library', async () => {
  assert.ok(
    (
      await violations(
        "import { useRegistryClient } from '@quark/registry';",
        'packages/ui/src/CLI/components/layout/Panel.tsx',
      )
    ).length > 0,
  );
});

test('package entry points stay free of registry imports', async () => {
  assert.ok(
    (await violations("export * from './web';", 'packages/ui/src/CLI/index.ts'))
      .length === 0,
  );
  assert.ok(
    (
      await violations(
        "import { x } from '@quark/registry';",
        'packages/ui/src/CLI/index.ts',
      )
    ).length > 0,
  );
});

test('CLI entry cannot import shared hooks', async () => {
  assert.ok(
    (
      await violations(
        "import { usePackageDetailsView } from '../hooks';",
        'packages/ui/src/CLI/index.ts',
      )
    ).length > 0,
  );
});

test('shared hooks cannot import ink or CLI components', async () => {
  for (const code of [
    "import { x } from 'ink';",
    "import { Screen } from '../CLI';",
    "import { renderAction } from '../../CLI';",
  ]) {
    assert.ok(
      (await violations(code, 'packages/ui/src/hooks/usePackageDetailsView.ts'))
        .length > 0,
    );
  }
});
