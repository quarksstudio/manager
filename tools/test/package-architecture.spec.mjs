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
  for (const file of await files('packages/web-ui/src')) {
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

test('functional Web views belong to their packages and receive services', async () => {
  for (const owner of [
    'identity',
    'commerce',
    'distribution',
    'package-search',
  ]) {
    for (const file of await files(`packages/${owner}/src/web`)) {
      if (!/\.tsx?$/.test(file)) continue;
      const source = await readFile(file, 'utf8');
      assert.ok(
        !/from ['"]@quarks\.studio\/(registry\/(?:CLI|web|react|client)|ui)(?:\/|['"])/.test(
          source,
        ),
        file,
      );
      assert.ok(
        !/\b(fetch|createRegistryClient|loadConfig)\s*\(/.test(source),
        file,
      );
      assert.ok(!/import\.meta\.env/.test(source), file);
      assert.ok(!/from ['"][^'"]*apps\/ui/.test(source), file);
    }
  }
  const appFiles = await files('apps/ui/src');
  assert.ok(
    !appFiles.some((file) => file.includes('/components/')),
    'React components remain in the app',
  );
});

test('the refactor does not add lazy loading to screens or WebAuthn', async () => {
  const sources = [
    ...(await files('packages/identity/src/CLI')),
    ...(await files('packages/distribution/src/CLI')),
    ...(await files('packages/package-search/src/CLI')),
    'packages/certification/src/infrastructure/webauthn-ceremony.ts',
  ];
  for (const file of sources) {
    const source = await readFile(file, 'utf8');
    assert.ok(!/\bimport\s*\(|\b(?:React\.)?lazy\s*\(/.test(source), file);
  }
});

test('obsolete facade packages are absent', async () => {
  for (const owner of ['ui', 'local-store', 'use-storage', 'types'])
    await assert.rejects(readFile(`packages/${owner}/package.json`, 'utf8'), {
      code: 'ENOENT',
    });
});
test('every custom hook has its own file in its owner hooks directory', async () => {
  for (const file of await files('packages')) {
    if (
      !/\.tsx?$/.test(file) ||
      file.endsWith('.d.ts') ||
      !file.includes('/src/')
    )
      continue;
    const source = await readFile(file, 'utf8');
    for (const match of source.matchAll(/function (use[A-Z]\w*)\s*[<(]/g))
      assert.ok(
        file.endsWith(`/src/hooks/${match[1]}.ts`),
        `${match[1]} in ${file}`,
      );
  }
});

test('business contracts have one owner and the domain kernel stays minimal', async () => {
  const declarations = new Map([
    ['Certification', 'certification'],
    ['CertificationTier', 'certification'],
    ['CertificationStatus', 'certification'],
    ['SubscriptionRecord', 'commerce'],
    ['DomainError', 'domain-kernel'],
  ]);
  const found = new Map();
  for (const file of await files('packages')) {
    if (
      file.endsWith('.d.ts') ||
      !file.endsWith('.ts') ||
      !file.includes('/src/')
    )
      continue;
    const source = await readFile(file, 'utf8');
    assert.ok(!source.includes('@quarks.studio/' + 'types'), file);
    for (const [name, owner] of declarations) {
      if (
        !new RegExp(`export (?:class|interface|type) ${name}\\b`).test(source)
      )
        continue;
      assert.ok(
        file.startsWith(`packages/${owner}/src/domain/`) ||
          (owner === 'domain-kernel' &&
            file === 'packages/domain-kernel/src/domain-error.ts'),
        file,
      );
      found.set(name, (found.get(name) ?? 0) + 1);
    }
  }
  for (const name of declarations.keys())
    assert.equal(found.get(name), 1, name);
  const manifest = JSON.parse(
    await readFile('packages/domain-kernel/package.json', 'utf8'),
  );
  assert.deepEqual(manifest.dependencies, {});
  for (const file of await files('packages/domain-kernel/src')) {
    const source = await readFile(file, 'utf8');
    assert.ok(
      !/export (?:class|interface|type|const) (?:Clock|Result|systemClock)\b/.test(
        source,
      ),
    );
    for (const match of source.matchAll(
      /(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g,
    ))
      assert.ok(match[1].startsWith('.'), file);
  }
  for (const file of await files('packages')) {
    if (!file.endsWith('package.json')) continue;
    const manifest = JSON.parse(await readFile(file, 'utf8'));
    assert.ok(!manifest.dependencies?.['@quarks.studio/' + 'types'], file);
  }
});
