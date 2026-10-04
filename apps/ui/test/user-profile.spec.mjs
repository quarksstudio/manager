import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

async function listen(server) {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return server.address().port;
}
for (const mode of ['ssr', 'client']) {
  test(`profile uses a client-only shell without proxies in ${mode} mode`, async () => {
    const requests = [];
    const api = http.createServer((req, res) => {
      requests.push(req.url);
      res.setHeader('Content-Type', 'application/json');
      res.end('{}');
    });
    const apiPort = await listen(api);
    const reservation = http.createServer();
    const port = await listen(reservation);
    await new Promise((done) => reservation.close(done));
    let logs = '';
    const child = spawn(process.execPath, ['dist/apps/ui/server/entry.mjs'], {
      env: {
        ...process.env,
        HOST: '127.0.0.1',
        PORT: String(port),
        QUARK_REGISTRY_URL: `http://127.0.0.1:${apiPort}/v1`,
        QUARK_RENDER_MODE: mode,
        QUARKS_ENV: 'production',
        QUARK_TOKEN: '',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout.on('data', (data) => {
      logs += data;
    });
    child.stderr.on('data', (data) => {
      logs += data;
    });
    const base = `http://127.0.0.1:${port}`;
    try {
      let ready = false;
      for (let attempt = 0; attempt < 100; attempt++) {
        if (child.exitCode !== null) throw new Error(logs);
        try {
          await fetch(`${base}/pricing`);
          ready = true;
          break;
        } catch {
          await new Promise((done) => setTimeout(done, 100));
        }
      }
      assert.ok(ready, logs);
      requests.length = 0;
      const response = await fetch(`${base}/~/alice`);
      assert.equal(response.status, 200);
      const html = await response.text();
      assert.match(html, /astro-island/);
      assert.match(html, /ConfiguredUserProfile/);
      assert.match(html, /alice/);
      const settings = await fetch(`${base}/~/alice/settings`);
      assert.equal(settings.status, 200);
      const settingsHtml = await settings.text();
      assert.match(settingsHtml, /ConfiguredUserProfileSettings/);
      assert.match(settingsHtml, /astro-island/);
      assert.equal(
        requests.length,
        0,
        'Astro must not fetch profile or settings data',
      );
      assert.equal((await fetch(`${base}/api/users/alice`)).status, 404);
      assert.equal(
        (await fetch(`${base}/api/users/alice/packages`)).status,
        404,
      );
    } finally {
      child.kill('SIGTERM');
      await once(child, 'exit');
      await new Promise((done) => api.close(done));
    }
  });
}
