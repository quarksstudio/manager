import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import path from 'node:path';

// Run after building web. The same checks can target an isolated packed consumer.
test('Astro serves package routes, forms, downloads and request-scoped sessions', async () => {
  const requests = [];
  const api = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks).toString();
    requests.push({
      url: req.url,
      method: req.method,
      token: req.headers.authorization,
      body,
    });
    res.setHeader('Content-Type', 'application/json');
    if (req.url.startsWith('/identitytoolkit'))
      return res.end(JSON.stringify({ idToken: 'local-token' }));
    if (req.url === '/v1/auth/exchange')
      return res.end(JSON.stringify({ accessToken: 'local-token' }));
    if (req.url === '/v1/auth/logout') return res.end('{}');
    if (req.headers.authorization === 'Bearer expired') {
      res.statusCode = 401;
      return res.end('{}');
    }
    if (req.method === 'PATCH') {
      if (!req.headers.authorization) {
        res.statusCode = 403;
        return res.end('{}');
      }
      return res.end('{}');
    }
    if (req.url.endsWith('/bundle')) {
      res.setHeader('Content-Type', 'application/gzip');
      res.setHeader('Content-Disposition', 'attachment; filename="demo.tgz"');
      return res.end('archive');
    }
    if (req.url.endsWith('/readme'))
      return res.end(
        JSON.stringify({ content: '# README\n<script>alert(1)</script>' }),
      );
    if (req.url === '/v1/package?query=')
      return res.end(JSON.stringify({ items: [{ id: '@scope/demo' }] }));
    const name = decodeURIComponent(req.url.slice('/v1/package/'.length));
    if (name === 'missing') {
      res.statusCode = 404;
      return res.end('{}');
    }
    return res.end(
      JSON.stringify({
        id: name,
        name,
        description: 'SSR package',
        authors: ['alice'],
        tags: ['demo'],
        downloads: 10,
        canEditMetadata: !!req.headers.authorization,
        versions: name === 'empty' ? [] : [{ version: '1.0.0' }],
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
  const child = spawn(process.execPath, ['dist/apps/ui/server/entry.mjs'], {
    cwd: process.env.WEB_VALIDATION_ROOT || process.cwd(),
    env: {
      ...process.env,
      HOST: '127.0.0.1',
      PORT: String(port),
      REGISTRY_API_URL: `http://127.0.0.1:${apiPort}/v1`,
      QUARK_ENV: 'local',
      FIREBASE_AUTH_EMULATOR_HOST: `127.0.0.1:${apiPort}`,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (data) => {
    logs += data;
  });
  child.stderr.on('data', (data) => {
    logs += data;
  });
  const request = (route, init) =>
    fetch(base + route, { redirect: 'manual', ...init });
  const route = '/packages/%40scope%2Fdemo/1.0.0';
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
    const latest = await request('/packages/%40scope%2Fdemo');
    assert.equal(latest.status, 302);
    assert.equal(latest.headers.get('location'), route);
    const page = await request(route);
    assert.equal(page.status, 200);
    const html = await page.text();
    assert.match(html, /SSR package/);
    assert.match(html, /<h1>README<\/h1>/);
    // Site chrome wraps every page.
    assert.match(html, /data-slot="site-navbar"/);
    assert.match(html, /data-slot="site-footer"/);
    // Raw Markdown is safely serialized as island props; rendered HTML must not contain executable markup.
    assert.ok(!html.includes('<script>alert(1)</script>'));
    assert.equal((await request('/packages/missing')).status, 404);
    assert.equal((await request('/packages/demo/missing')).status, 404);
    assert.match(
      await (await request('/packages/empty')).text(),
      /No published versions/,
    );
    const download = await request(`${route}/download`);
    assert.equal(
      download.headers.get('content-disposition'),
      'attachment; filename="demo.tgz"',
    );
    assert.equal(await download.text(), 'archive');
    const form = new URLSearchParams({
      description: 'Updated',
      tags: 'demo',
      authors: 'alice',
    });
    assert.equal(
      (
        await request(route, {
          method: 'POST',
          headers: { origin: 'https://other.example' },
          body: form,
        })
      ).status,
      403,
    );
    const denied = await request(route, {
      method: 'POST',
      headers: { origin: base },
      body: form,
    });
    assert.equal(denied.status, 403);
    const invalid = await request(route, {
      method: 'POST',
      headers: { origin: base, cookie: 'quark-session=alice' },
      body: new URLSearchParams({
        description: '',
        tags: 'demo',
        authors: 'alice',
      }),
    });
    assert.equal(invalid.status, 400, await invalid.clone().text());
    assert.match(await invalid.text(), /Check description/);
    const saved = await request(route, {
      method: 'POST',
      headers: { origin: base, cookie: 'quark-session=alice' },
      body: form,
    });
    assert.equal(saved.status, 303);
    await Promise.all(
      ['alice', 'bob'].map((user) =>
        request(route, { headers: { cookie: `quark-session=${user}` } }),
      ),
    );
    for (const user of ['alice', 'bob'])
      assert.ok(
        requests.some(
          (req) =>
            req.url.endsWith('/readme') && req.token === `Bearer ${user}`,
        ),
      );
    const expired = await request(route, {
      headers: { cookie: 'quark-session=expired' },
    });
    assert.equal(expired.status, 401);
    assert.match(expired.headers.get('set-cookie'), /quark-session=/);
    const login = await request('/auth/local', {
      method: 'POST',
      headers: { origin: base },
      body: new URLSearchParams({ user: 'developer' }),
    });
    assert.equal(login.status, 303, logs);
    assert.match(login.headers.get('set-cookie'), /HttpOnly/i);
    const logout = await request('/auth/logout', {
      method: 'POST',
      headers: { origin: base, cookie: 'quark-session=alice' },
    });
    assert.equal(logout.status, 303);
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
