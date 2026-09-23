import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
test('published web bundle uses the JSX runtime and contains no transport hooks', async () => {
  const source = await readFile('dist/packages/ui/src/web/index.mjs', 'utf8');
  assert.ok(source.includes('react/jsx-runtime'));
  assert.ok(!source.includes('React.createElement'));
  assert.ok(!source.includes('useRegistryClient'));
});
test('published styles are compiled and include component utility classes', async () => {
  const css = await readFile('dist/packages/ui/src/web/styles.css', 'utf8');
  assert.ok(!css.includes("@import 'tailwindcss'"));
  assert.ok(!css.includes('@source'));
  assert.ok(css.includes('.max-w-6xl'));
});
