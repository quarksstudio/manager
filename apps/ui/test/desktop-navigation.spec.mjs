import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createRequire } from 'node:module';
const { registerNavigation } = createRequire(import.meta.url)(
  '../desktop/navigation.cjs',
);
test('renderer cannot navigate to foreign origins, open windows, embed webviews or request permissions', () => {
  const contents = new EventEmitter();
  let open, permission, check;
  contents.setWindowOpenHandler = (fn) => {
    open = fn;
  };
  contents.session = {
    setPermissionRequestHandler(fn) {
      permission = fn;
    },
    setPermissionCheckHandler(fn) {
      check = fn;
    },
  };
  registerNavigation({ webContents: contents }, 'http://127.0.0.1:4210');
  for (const kind of ['will-navigate', 'will-redirect']) {
    for (const url of [
      'https://evil.test/',
      'javascript:alert(1)',
      'http://127.0.0.1:4211/',
      'http://user@127.0.0.1:4210/',
    ]) {
      let prevented = false;
      contents.emit(
        kind,
        {
          preventDefault() {
            prevented = true;
          },
        },
        url,
      );
      assert.equal(prevented, true, url);
    }
    let prevented = false;
    contents.emit(
      kind,
      {
        preventDefault() {
          prevented = true;
        },
      },
      'http://127.0.0.1:4210/~/callback',
    );
    assert.equal(prevented, false);
  }
  assert.deepEqual(open({ url: 'https://evil.test/' }), { action: 'deny' });
  let embedded = false;
  contents.emit('will-attach-webview', {
    preventDefault() {
      embedded = true;
    },
  });
  assert.equal(embedded, true);
  permission(contents, 'camera', (granted) => assert.equal(granted, false));
  assert.equal(check(contents, 'clipboard-read'), false);
});

test('only the configured OAuth route can open an unprivileged authentication window', () => {
  const contents = new EventEmitter();
  let open;
  contents.setWindowOpenHandler = (fn) => {
    open = fn;
  };
  contents.session = {
    setPermissionRequestHandler() {},
    setPermissionCheckHandler() {},
  };
  registerNavigation(
    { webContents: contents },
    'http://127.0.0.1:4210',
    'https://registry.test/v1',
  );
  const callback = 'http://127.0.0.1:4210/callback?state=random-secret';
  const auth = `https://registry.test/v1/auth/login/google/${encodeURIComponent(callback)}`;
  const decision = open({ url: auth });
  assert.equal(decision.action, 'allow');
  assert.deepEqual(decision.overrideBrowserWindowOptions.webPreferences, {
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true,
    webviewTag: false,
    preload: '',
  });
  for (const url of [
    auth.replace('registry.test', 'evil.test'),
    auth.replace('google', 'unknown'),
    `https://registry.test/v1/auth/login/google/${encodeURIComponent('https://evil.test/callback?state=x')}`,
  ])
    assert.equal(open({ url }).action, 'deny');
});
