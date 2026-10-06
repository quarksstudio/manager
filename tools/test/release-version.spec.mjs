import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const script = new URL('../resolve-release-version.mjs', import.meta.url);
test('release versions are data and cannot inject shell commands or output fields', () => {
  const dir = mkdtempSync(join(tmpdir(), 'release-version-'));
  try {
    const output = join(dir, 'output');
    for (const value of ['manager-v1.2.3', '1.2.3-rc.1']) {
      const result = spawnSync(process.execPath, [script.pathname], {
        env: { ...process.env, RELEASE_REF: value, GITHUB_OUTPUT: output },
      });
      assert.equal(result.status, 0, result.stderr.toString());
    }
    assert.equal(
      readFileSync(output, 'utf8'),
      'version=1.2.3\nversion=1.2.3-rc.1\n',
    );
    for (const value of [
      `1.2.3$(touch ${join(dir, 'executed')})`,
      '`echo bad`',
      '1.2.3\nkey=evil',
      '1.2.3-01',
      '1.2',
    ]) {
      const result = spawnSync(process.execPath, [script.pathname], {
        env: { ...process.env, RELEASE_REF: value, GITHUB_OUTPUT: output },
      });
      assert.notEqual(result.status, 0);
    }
    assert.equal(existsSync(join(dir, 'executed')), false);
    assert.equal(
      readFileSync(output, 'utf8'),
      'version=1.2.3\nversion=1.2.3-rc.1\n',
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
