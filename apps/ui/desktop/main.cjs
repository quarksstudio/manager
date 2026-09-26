// Electron shell for the ClientRender output of apps/ui.
// Embeds the Astro SSR entry (node standalone) and opens the app in a window
// with RENDER_MODE=client: the React islands fetch from the registry API.
const { app, BrowserWindow } = require('electron');
const { spawn } = require('node:child_process');
const path = require('node:path');

const port = Number(process.env.PORT || 4210);
const host = '127.0.0.1';
const entry = path.resolve(__dirname, '../../dist/apps/ui/server/entry.mjs');
const origin = `http://${host}:${port}`;

let server;

function waitForServer(timeoutMs = 20000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = async () => {
      try {
        const response = await fetch(`${origin}/`);
        if (response.ok) return resolve();
      } catch {
        /* not ready yet */
      }
      if (Date.now() - started > timeoutMs)
        return reject(new Error('Timed out waiting for the local server.'));
      setTimeout(attempt, 100);
    };
    void attempt();
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Quark // Skills',
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });
  void win.loadURL(origin);
  win.on('closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}

async function start() {
  server = spawn('node', [entry], {
    env: {
      ...process.env,
      RENDER_MODE: 'client',
      HOST: host,
      PORT: String(port),
      REGISTRY_API_URL:
        process.env.REGISTRY_API_URL || 'http://localhost:8081/v1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', (data) => process.stdout.write(data));
  server.stderr.on('data', (data) => process.stderr.write(data));
  server.on('exit', (code) => {
    if (code !== 0) console.error(`Local server exited with code ${code}`);
    if (!app.isQuitting) app.quit();
  });
  try {
    await waitForServer();
  } catch (error) {
    console.error(error.message);
    app.quit();
    return;
  }
  createWindow();
}

app.whenReady().then(start);
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
app.on('before-quit', () => {
  app.isQuitting = true;
  if (server) server.kill('SIGTERM');
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
