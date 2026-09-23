import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
async function files(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (['node_modules', 'dist', '.git', '.astro', '.nx'].includes(entry.name))
      continue;
    const name = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...(await files(name)));
    else result.push(name);
  }
  return result;
}
test('package and app tests live in test, not src', async () => {
  for (const group of ['packages', 'apps']) {
    for (const file of await files(group))
      assert.ok(!/\/src\/.*\.(spec|test)\.[cm]?[jt]sx?$/.test(file), file);
  }
});
test('React presentation has no data transport or session access', async () => {
  for (const file of await files('packages/ui/src/web')) {
    if (!/\.tsx?$/.test(file)) continue;
    const source = await readFile(file, 'utf8');
    assert.ok(
      !/\b(fetch|apiFetch|useRegistryClient|createRegistryClient|localStorage|sessionStorage)\s*[.(]/.test(
        source,
      ),
      file,
    );
    assert.ok(!/from ['"][^'"]*\/hooks(?:\/|['"])/.test(source), file);
  }
});
