function registerNavigation(win, origin, apiBase) {
  const allowed = (raw) => {
    try {
      const url = new URL(raw);
      return url.origin === origin && !url.username && !url.password;
    } catch {
      return false;
    }
  };
  const isLogin = (raw) => {
    if (!apiBase) return false;
    try {
      const api = new URL(apiBase);
      const url = new URL(raw);
      const prefix = `${api.pathname.replace(/\/$/, '')}/auth/login/`;
      if (
        url.origin !== api.origin ||
        url.username ||
        url.password ||
        !url.pathname.startsWith(prefix)
      )
        return false;
      const parts = url.pathname.slice(prefix.length).split('/');
      if (parts.length !== 2 || !['google', 'github'].includes(parts[0]))
        return false;
      const callback = new URL(decodeURIComponent(parts[1]));
      return (
        callback.origin === origin &&
        !callback.username &&
        !callback.password &&
        ['/callback', '/~/callback'].includes(callback.pathname) &&
        Boolean(callback.searchParams.get('state'))
      );
    } catch {
      return false;
    }
  };
  const navigate = (event, url) => {
    if (!allowed(url)) event.preventDefault();
  };
  // Authentication keeps its opener handshake, in a separate sandboxed window
  // without the notification preload or any other privileged renderer bridge.
  win.webContents.setWindowOpenHandler(({ url }) =>
    isLogin(url)
      ? {
          action: 'allow',
          overrideBrowserWindowOptions: {
            webPreferences: {
              nodeIntegration: false,
              contextIsolation: true,
              sandbox: true,
              webviewTag: false,
              preload: '',
            },
          },
        }
      : { action: 'deny' },
  );
  win.webContents.on('did-create-window', (child) => {
    child.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    const safeAuthNavigation = (event, raw) => {
      try {
        const url = new URL(raw);
        if (
          url.username ||
          url.password ||
          !(url.protocol === 'https:' || allowed(raw) || isLogin(raw))
        )
          event.preventDefault();
      } catch {
        event.preventDefault();
      }
    };
    child.webContents.on('will-navigate', safeAuthNavigation);
    child.webContents.on('will-redirect', safeAuthNavigation);
    child.webContents.on('will-attach-webview', (event) =>
      event.preventDefault(),
    );
  });
  win.webContents.on('will-navigate', navigate);
  win.webContents.on('will-redirect', navigate);
  win.webContents.on('will-attach-webview', (event) => event.preventDefault());
  win.webContents.session.setPermissionRequestHandler(
    (_contents, _permission, callback) => callback(false),
  );
  win.webContents.session.setPermissionCheckHandler(() => false);
}
module.exports = { registerNavigation };
