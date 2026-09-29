import type { BrowserLauncher } from '../application/identity.port';

async function openWithShell(url: string): Promise<undefined> {
  const { spawn } = await import('child_process');
  const command =
    process.platform === 'darwin'
      ? { executable: 'open', args: [url] }
      : process.platform === 'win32'
        ? { executable: 'cmd', args: ['/c', 'start', '', url] }
        : { executable: 'xdg-open', args: [url] };
  const child = spawn(command.executable, command.args, {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
  return undefined;
}

/**
 * A browser when there is one, the platform's own handler when there is not.
 * In Node.js the browser owns the window, so no handle is returned.
 */
export function createSystemBrowserLauncher(): BrowserLauncher {
  return {
    open: (url, target, features) =>
      typeof window !== 'undefined'
        ? Promise.resolve(window.open(url, target ?? '_blank', features))
        : openWithShell(url),
  };
}
