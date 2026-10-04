import { test } from 'node:test';
import assert from 'node:assert/strict';

test('Astro exposes QUARKS_ENV and omits the removed name and token', async () => {
  const keys = ['QUARKS_ENV', 'QUARK_ENV', 'QUARK_TOKEN'];
  const previous = keys.map((key) => process.env[key]);
  try {
    process.env.QUARKS_ENV = 'local';
    process.env.QUARK_ENV = 'production';
    process.env.QUARK_TOKEN = 'test-server-only-token';
    const { default: config } = await import('../astro.config.mjs');
    const browserEnv = JSON.parse(config.vite.define.__QUARK_ENV__);
    assert.equal(browserEnv.QUARKS_ENV, 'local');
    assert.equal(Object.hasOwn(browserEnv, 'QUARK_ENV'), false);
    assert.equal(Object.hasOwn(browserEnv, 'QUARK_TOKEN'), false);
  } finally {
    keys.forEach((key, index) => {
      if (previous[index] === undefined) delete process.env[key];
      else process.env[key] = previous[index];
    });
  }
});

// Fixtures avoid depending on or rewriting the developer's actual .env.
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadUiEnvironment } from '../astro-env.mjs';

test('dotenv endpoint reaches both island props and shared configuration, with process precedence', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'quark-ui-env-'));
  const original = process.env.QUARK_REGISTRY_URL;
  try {
    delete process.env.QUARK_REGISTRY_URL;
    await writeFile(
      join(directory, '.env'),
      'QUARK_REGISTRY_URL=http://dotenv.test/v1\nPUBLIC_QUARK_REGISTRY_URL=http://unused.test/v1\n',
    );
    const loaded = loadUiEnvironment('development', directory);
    assert.equal(loaded.registryUrl, 'http://dotenv.test/v1');
    assert.equal(loaded.browserEnv.QUARK_REGISTRY_URL, loaded.registryUrl);
    assert.equal(
      Object.hasOwn(loaded.browserEnv, 'PUBLIC_QUARK_REGISTRY_URL'),
      false,
    );
    process.env.QUARK_REGISTRY_URL = 'http://process.test/v1';
    const overridden = loadUiEnvironment('development', directory);
    assert.equal(overridden.registryUrl, 'http://process.test/v1');
    assert.equal(
      overridden.browserEnv.QUARK_REGISTRY_URL,
      overridden.registryUrl,
    );
    delete process.env.QUARK_REGISTRY_URL;
    await writeFile(
      join(directory, '.env.production'),
      'QUARK_REGISTRY_URL=http://production.test/v1\n',
    );
    assert.equal(
      loadUiEnvironment('production', directory).registryUrl,
      'http://production.test/v1',
    );
  } finally {
    if (original === undefined) delete process.env.QUARK_REGISTRY_URL;
    else process.env.QUARK_REGISTRY_URL = original;
    await rm(directory, { recursive: true, force: true });
  }
});
