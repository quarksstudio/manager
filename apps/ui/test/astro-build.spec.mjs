import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { execFileSync, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { once } from 'node:events';
import { resolve } from 'node:path';

const app = resolve(import.meta.dirname, '..');
const astroBin = existsSync(resolve(app, 'node_modules/.bin/astro'))
  ? resolve(app, 'node_modules/.bin/astro')
  : resolve(app, '../../node_modules/.bin/astro');
const dist = resolve(app, '../../dist/apps/ui');

test('astro build emits the SSR server bundle, client assets and antd.css', () => {
  execFileSync(astroBin, ['build'], { cwd: app, stdio: 'pipe' });
  assert.ok(
    existsSync(resolve(dist, 'server/entry.mjs')),
    'expected dist/apps/ui/server/entry.mjs',
  );
  assert.ok(
    existsSync(resolve(dist, 'client/antd.css')),
    'expected dist/apps/ui/client/antd.css',
  );
  assert.ok(
    existsSync(resolve(dist, 'client/_astro')),
    'expected island client output',
  );
});

test('RENDER_MODE=client serves shells with islands instead of server data', async () => {
  const api = http.createServer(async (req, res) => {
    if (req.url === '/v1/package?query=') {
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ items: [{ id: '@scope/demo' }] }));
    }
    res.setHeader('Content-Type', 'application/json');
    const name = decodeURIComponent(req.url.slice('/v1/package/'.length));
    return res.end(
      JSON.stringify({
        id: name,
        name,
        description: 'SSR package',
        authors: ['alice'],
        tags: ['demo'],
        downloads: 10,
        canEditMetadata: !!req.headers.authorization,
        versions: [{ version: '1.0.0' }],
      }),
    );
  });
  api.listen(0, '127.0.0.1');
  await once(api, 'listening');
  const apiPort = api.address().port;
  const reservation = http.createServer();
  reservation.listen(0, '127.0.0.1');
  await once(reservation, 'listening');
  const port = reservation.address().port;
  await new Promise((resolve) => reservation.close(resolve));
  const base = `http://127.0.0.1:${port}`;
  let logs = '';
  const child = spawn(process.execPath, [resolve(dist, 'server/entry.mjs')], {
    cwd: resolve(app, '../..'),
    env: {
      ...process.env,
      RENDER_MODE: 'client',
      HOST: '127.0.0.1',
      PORT: String(port),
      REGISTRY_API_URL: `http://127.0.0.1:${apiPort}/v1`,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (data) => (logs += data));
  child.stderr.on('data', (data) => (logs += data));
  const request = (route) => fetch(base + route, { redirect: 'manual' });
  try {
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      try {
        await request('/');
        ready = true;
        break;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }
    assert.ok(ready, logs);
    const landing = await request('/');
    assert.equal(landing.status, 200);
    const html = await landing.text();
    assert.match(html, /data-slot="site-navbar"/, 'navbar must wrap pages');
    assert.match(html, /data-slot="site-footer"/, 'footer must wrap pages');
    assert.match(html, /_astro\//, 'island assets must be wired');
    assert.ok(
      !html.includes('Tier 1 - Basic Certification'),
      'server rendering must be disabled under RENDER_MODE=client',
    );
    const page = await request('/packages/%40scope%2Fdemo/1.0.0');
    assert.equal(page.status, 200);
    const packagesHtml = await page.text();
    assert.match(packagesHtml, /data-slot="site-navbar"/);
    assert.ok(
      !packagesHtml.includes('SSR package'),
      'package data must load client-side only',
    );
  } catch (error) {
    console.error(logs);
    throw error;
  } finally {
    child.kill('SIGTERM');
    await once(child, 'exit');
    api.closeAllConnections();
    await new Promise((resolve) => api.close(resolve));
  }
});
