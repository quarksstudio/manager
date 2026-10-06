import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
test('kernel host blocks sync and libuv filesystem escapes, writes, sockets, and subprocesses', () => {
  const dir = mkdtempSync(join(tmpdir(), 'kernel-host-'));
  try {
    const launcher = join(dir, 'launcher');
    const compilation = spawnSync('cc', [
      '-O2',
      '-Wall',
      '-Wextra',
      '-Werror',
      new URL('../../packages/runtime/native/host.c', import.meta.url).pathname,
      '-o',
      launcher,
    ]);
    assert.equal(compilation.status, 0, compilation.stderr.toString());
    const entry = join(dir, 'entry.cjs');
    writeFileSync(
      entry,
      `
      const fs = require('fs'); const cp = require('child_process'); const net = require('net');
      const assert = require('assert/strict');
      assert.throws(() => fs.readFileSync('/etc/passwd'), /EACCES/);
      assert.throws(() => fs.writeFileSync(__dirname + '/write', 'x'), /EACCES/);
      fs.readFile('/etc/passwd', err => { assert.equal(err.code, 'EACCES'); console.log('async-read-blocked'); });
      const socket = net.connect({ host: '127.0.0.1', port: 9 });
      socket.on('error', err => { assert.equal(err.code, 'EPERM'); console.log('network-blocked'); });
      assert.throws(() => cp.spawn(process.execPath, ['-e', 'console.log("escape")']), /EPERM/);
      console.log('subprocess-blocked');
      console.log('filesystem-blocked');
    `,
    );
    // Keep package input separate from the executable and test secrets.
    const result = spawnSync(launcher, [process.execPath, dir, entry], {
      timeout: 5000,
      env: { PATH: process.env.PATH },
    });
    assert.equal(result.status, 0, result.stderr.toString());
    for (const proof of [
      'async-read-blocked',
      'filesystem-blocked',
      'network-blocked',
      'subprocess-blocked',
    ])
      assert.match(result.stdout.toString(), new RegExp(proof));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
