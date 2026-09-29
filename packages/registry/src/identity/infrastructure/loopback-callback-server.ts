import type { LoopbackCallback } from '../application/identity.port';

const CALLBACK_PATH = '/callback';
const CALLBACK_TIMEOUT_MS = 180_000;

/**
 * A one-shot `http://127.0.0.1` listener for hosts with no browser to redirect.
 *
 * The redirect URL can only be built after the port is known, so the port is
 * chosen first and the caller is asked to open the URL afterwards. The `state`
 * check is what makes the callback unforgeable: anything that did not come
 * through this listener is answered `400` and never resolves the promise.
 */
export function createLoopbackCallback(
  timeoutMs = CALLBACK_TIMEOUT_MS,
): LoopbackCallback {
  return {
    async capture({ port, authorizationUrl, open }) {
      if (typeof window !== 'undefined') {
        throw new Error('Local-server login is only available in Node.js');
      }
      const [{ createServer }, { randomBytes }] = await Promise.all([
        import('http'),
        import('crypto'),
      ]);
      const state = randomBytes(32).toString('base64url');
      let timer: ReturnType<typeof setTimeout>;
      let settled = false;

      return new Promise<{ token: string; refreshToken?: string }>(
        (resolve, reject) => {
          const server = createServer((request, response) => {
            const url = new URL(
              request.url ?? '/',
              `http://${request.headers.host}`,
            );
            if (url.pathname !== CALLBACK_PATH) {
              response.writeHead(404).end('Not found');
              return;
            }
            const receivedState = url.searchParams.get('state');
            const token =
              url.searchParams.get('idToken') ?? url.searchParams.get('token');
            const refreshToken = url.searchParams.get('refreshToken') ?? undefined;
            if (receivedState !== state || !token) {
              response.writeHead(400, { 'Content-Type': 'text/plain' });
              response.end('Invalid authentication callback.');
              return;
            }
            settled = true;
            clearTimeout(timer);
            response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            response.end(
              '<h1>Authentication completed</h1><p>You may close this tab.</p>',
            );
            server.close();
            resolve({ token, refreshToken });
          });

          server.on('error', reject);
          server.listen(port ?? 0, '127.0.0.1', async () => {
            const address = server.address();
            if (!address || typeof address === 'string') {
              server.close();
              reject(new Error('Could not determine local callback port'));
              return;
            }
            const callback = `http://127.0.0.1:${address.port}${CALLBACK_PATH}?state=${encodeURIComponent(state)}`;
            try {
              await open(authorizationUrl(callback));
            } catch (error) {
              server.close();
              reject(error);
            }
          });

          timer = setTimeout(() => {
            if (settled) return;
            server.close();
            reject(new Error('Authentication timed out after 3 minutes'));
          }, timeoutMs);
        },
      );
    },
  };
}
