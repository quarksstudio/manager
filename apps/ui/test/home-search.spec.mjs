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
for (const mode of ['ssr', 'client'])
  test(`homepage search uses a browser island in ${mode} mode`, async () => {
    const requests = [];
    const api = http.createServer((req, res) => {
      requests.push(req.url);
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ items: [], totalCount: 0, nextCursor: null }));
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
          await fetch(`${base}/?query=`);
          ready = true;
          break;
        } catch {
          await new Promise((done) => setTimeout(done, 100));
        }
      }
      assert.ok(ready, logs);
      requests.length = 0;
      for (const query of [
        'query=Demo&tags=AI&tags=chat&exact=false',
        'query=',
        'author=uid',
        'q=legacy',
        'cursor=page',
      ]) {
        const response = await fetch(`${base}/?${query}`);
        assert.equal(response.status, 200);
        const html = await response.text();
        assert.match(html, /ConfiguredPackageSearchResults/);
        assert.match(html, /client="only"/);
        assert.doesNotMatch(
          html.slice(html.indexOf('<body')),
          /Formal Certification and Secure Distribution/,
        );
        assert.match(html, /name="query"/);
        assert.match(html, /action="\/"/);
        assert.match(html, /type="submit"/);
        if (query.startsWith('query=Demo')) assert.match(html, /value="Demo"/);
        if (query === 'q=legacy') {
          assert.match(html, /query=legacy/);
          assert.match(html, /value="legacy"/);
        }
      }
      assert.equal(
        requests.length,
        0,
        'Astro must not execute searches on the backend',
      );
      const landing = await fetch(`${base}/?utm_source=blog`);
      const html = await landing.text();
      assert.doesNotMatch(html, /ConfiguredPackageSearchResults/);
      if (mode === 'client') {
        assert.match(html, /ConfiguredLandingBoundary/);
        assert.equal(requests.length, 0);
      } else {
        assert.match(html, /Formal Certification and Secure Distribution/);
        assert.match(html, /href="\/\?query="/);
        assert.ok(requests.length > 0);
      }
    } finally {
      child.kill('SIGTERM');
      await once(child, 'exit');
      await new Promise((done) => api.close(done));
    }
  });
