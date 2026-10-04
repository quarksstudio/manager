import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { registerNotifications } = require('../desktop/notifications.cjs');
const message = { level: 'success', title: 'Login' };

function setup(behavior = 'show', supported = true) {
  let handler;
  let notice;
  class Notification extends EventEmitter {
    static isSupported() {
      return supported;
    }
    constructor(payload) {
      super();
      this.payload = payload;
      notice = this;
    }
    show() {
      if (behavior !== 'timeout') this.emit(behavior);
    }
    close() {
      this.emit('close');
    }
  }
  const webContents = { mainFrame: { url: 'http://127.0.0.1:4210/' } };
  const win = { webContents };
  let focused = 0;
  const dispose = registerNotifications({
    ipcMain: {
      handle(channel, fn) {
        assert.equal(channel, 'quark:notifications:show');
        handler = fn;
      },
      removeHandler() {},
    },
    Notification,
    origin: 'http://127.0.0.1:4210',
    getWindow: () => win,
    focusWindow: () => {
      focused++;
    },
  });
  return {
    send: (
      payload = message,
      event = { sender: webContents, senderFrame: webContents.mainFrame },
    ) => handler(event, payload),
    get notice() {
      return notice;
    },
    get focused() {
      return focused;
    },
    dispose,
    webContents,
  };
}

test('native delivery confirms once, focuses on click, and disposes', async () => {
  const runtime = setup();
  assert.equal(await runtime.send(), 'shown');
  runtime.notice.emit('click');
  assert.equal(runtime.focused, 1);
  runtime.dispose();
});
test('unsupported and failed notifications report fallback outcomes', async () => {
  const unsupported = setup('show', false);
  assert.equal(await unsupported.send(), 'unavailable');
  unsupported.dispose();
  const failed = setup('failed');
  assert.equal(await failed.send(), 'failed');
  failed.dispose();
});
test('invalid messages, other senders, subframes, and foreign origins are rejected', async () => {
  const runtime = setup();
  assert.equal(await runtime.send({ title: 'x', level: 'invalid' }), 'failed');
  assert.equal(
    await runtime.send({ ...message, title: 'x'.repeat(201) }),
    'failed',
  );
  assert.equal(
    await runtime.send(message, {
      sender: {},
      senderFrame: runtime.webContents.mainFrame,
    }),
    'failed',
  );
  assert.equal(
    await runtime.send(message, {
      sender: runtime.webContents,
      senderFrame: { url: 'http://127.0.0.1:4210/' },
    }),
    'failed',
  );
  runtime.webContents.mainFrame.url = 'https://example.com';
  assert.equal(await runtime.send(), 'failed');
  runtime.dispose();
});
test('missing delivery confirmation times out', async () => {
  const runtime = setup('timeout');
  assert.equal(await runtime.send(), 'failed');
  runtime.dispose();
});
test('sandboxed preload exposes only the notification capability', async () => {
  let bridge;
  const calls = [];
  vm.runInNewContext(
    readFileSync(new URL('../desktop/preload.cjs', import.meta.url), 'utf8'),
    {
      require(name) {
        assert.equal(name, 'electron');
        return {
          contextBridge: {
            exposeInMainWorld(name, value) {
              assert.equal(name, 'quarkDesktop');
              bridge = value;
            },
          },
          ipcRenderer: {
            invoke(...args) {
              calls.push(args);
              return Promise.resolve('shown');
            },
          },
        };
      },
    },
  );
  assert.deepEqual(Object.keys(bridge), ['notifications']);
  assert.equal(await bridge.notifications.show(message), 'shown');
  assert.deepEqual(calls, [['quark:notifications:show', message]]);
});
