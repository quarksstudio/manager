import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from 'eslint';
import tseslint from 'typescript-eslint';
import {
  componentRules as componentConfig,
  businessRules as boundaryConfig,
} from './cli-eslint-rules.mjs';

const linter = new Linter();
async function violations(code, filePath, ruleId) {
  const cli = filePath.includes('/CLI/');
  const selected = cli ? componentConfig : boundaryConfig;
  const messages = linter.verify(
    code,
    [
      {
        files: ['**/*.{ts,tsx}'],
        languageOptions: {
          parser: tseslint.parser,
          parserOptions: { ecmaFeatures: { jsx: true } },
        },
        plugins: selected.plugins ?? {},
        settings: selected.settings ?? {},
        rules: selected.rules,
      },
    ],
    { filename: filePath },
  );
  assert.ok(
    !messages.some((message) => message.fatal),
    JSON.stringify(messages),
  );
  return messages.filter((message) => message.ruleId === ruleId);
}

test('one component with ordinary helpers is allowed', async () => {
  assert.equal(
    (
      await violations(
        'const label = () => "hello"; export function Screen() { return <div>{label()}</div>; }',
        'packages/installer/src/CLI/Screen.tsx',
        'react/no-multi-comp',
      )
    ).length,
    0,
  );
});

test('multiple components, including private nested components, are rejected', async () => {
  for (const code of [
    'function First() { return <div />; } export function Second() { return <First />; }',
    'export function Outer() { function Inner() { return <div />; } return <Inner />; }',
  ]) {
    assert.ok(
      (
        await violations(
          code,
          'packages/installer/src/CLI/Screen.tsx',
          'react/no-multi-comp',
        )
      ).length > 0,
    );
  }
});

test('business cannot import, re-export or dynamically load presentation', async () => {
  for (const code of [
    "import { Screen } from '@quark/ui/CLI';",
    "export * from '../CLI';",
    "export { Publish } from '@quark/publisher/CLI';",
    "const cli = require('../CLI');",
    "const cli = import('@quark/ui/CLI');",
  ]) {
    assert.ok(
      (
        await violations(
          code,
          'packages/publisher/src/application/example.ts',
          'no-restricted-syntax',
        )
      ).length > 0,
    );
  }
});

test('CLI may consume shared presentation', async () => {
  assert.equal(
    (
      await violations(
        "import { Screen } from '@quark/ui/CLI';",
        'packages/installer/src/CLI/Screen.tsx',
        'no-restricted-syntax',
      )
    ).length,
    0,
  );
});
