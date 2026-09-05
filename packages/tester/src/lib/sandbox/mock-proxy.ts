import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import * as http from 'http';
import * as tls from 'tls';
import * as os from 'os';
import * as path from 'path';
import { promisify } from 'util';

import type { HttpMock } from '../types';

const execFileAsync = promisify(execFile);

export interface MockProxySession {
  url: string;
  caFile: string;
  stop(): Promise<string[]>;
}

/** A loopback-only HTTP/HTTPS proxy that can never forward traffic. */
export async function startMockProxy(
  mocks: HttpMock[],
): Promise<MockProxySession> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'quark-proxy-'));
  const caKey = path.join(directory, 'ca.key');
  const caFile = path.join(directory, 'ca.pem');
  await openssl([
    'req',
    '-x509',
    '-newkey',
    'rsa:2048',
    '-nodes',
    '-days',
    '1',
    '-subj',
    '/CN=Quark Test CA',
    '-keyout',
    caKey,
    '-out',
    caFile,
  ]);

  const expected = mocks.map((mock) => ({ mock, used: 0 }));
  const errors: string[] = [];
  const certificates = new Map<string, Promise<tls.SecureContext>>();
  let stopped = false;

  const handler: http.RequestListener = (request, response) => {
    const absolute = absoluteUrl(request);
    const match = expected.find(
      ({ mock, used }) =>
        mock.request.method === request.method &&
        normalizeUrl(mock.request.url) === normalizeUrl(absolute) &&
        used < (mock.times ?? 1),
    );
    if (!match) {
      errors.push(`Unexpected HTTP request: ${request.method} ${absolute}`);
      response.writeHead(502, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ error: 'No matching http_mock' }));
      return;
    }
    match.used += 1;
    response.writeHead(match.mock.response.status, {
      'content-type': 'application/json',
    });
    response.end(JSON.stringify(match.mock.response.body ?? null));
  };

  const server = http.createServer(handler);
  server.on('connect', (request, socket) => {
    const [host, port = '443'] = String(request.url ?? '').split(':');
    if (!host) {
      socket.destroy();
      return;
    }
    if (port !== '443') {
      socket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
      tunnel(socket, `http://${host}`);
      return;
    }
    const context = certificates.get(host) ?? certificate(host);
    certificates.set(host, context);
    void context
      .then((secureContext) => {
        socket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
        const secureSocket = new tls.TLSSocket(socket, {
          isServer: true,
          secureContext,
        });
        secureSocket.on('error', () => undefined);
        tunnel(secureSocket, `https://${host}`);
      })
      .catch((error: unknown) => {
        errors.push(`Mock TLS setup failed for ${host}: ${message(error)}`);
        socket.destroy();
      });
  });

  function tunnel(socket: NodeJS.ReadWriteStream, origin: string): void {
    const tunnelServer = http.createServer((innerRequest, response) => {
      Object.defineProperty(innerRequest, 'url', {
        value: `${origin}${innerRequest.url ?? '/'}`,
      });
      handler(innerRequest, response);
    });
    tunnelServer.emit('connection', socket);
  }

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string')
    throw new Error('Proxy bind failed');

  return {
    url: `http://127.0.0.1:${address.port}`,
    caFile,
    async stop() {
      if (stopped) return errors;
      stopped = true;
      await new Promise<void>((resolve) => server.close(() => resolve()));
      for (const { mock, used } of expected) {
        const wanted = mock.times ?? 1;
        if (used !== wanted)
          errors.push(
            `Expected ${mock.request.method} ${mock.request.url} ${wanted} time(s), observed ${used}`,
          );
      }
      await fs.rm(directory, { recursive: true, force: true });
      return errors;
    },
  };

  async function certificate(host: string): Promise<tls.SecureContext> {
    const safe = host.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = path.join(directory, `${safe}.key`);
    const csr = path.join(directory, `${safe}.csr`);
    const cert = path.join(directory, `${safe}.pem`);
    const ext = path.join(directory, `${safe}.ext`);
    await fs.writeFile(ext, `subjectAltName=DNS:${host}\n`);
    await openssl([
      'req',
      '-newkey',
      'rsa:2048',
      '-nodes',
      '-subj',
      `/CN=${host}`,
      '-keyout',
      key,
      '-out',
      csr,
    ]);
    await openssl([
      'x509',
      '-req',
      '-days',
      '1',
      '-in',
      csr,
      '-CA',
      caFile,
      '-CAkey',
      caKey,
      '-CAcreateserial',
      '-extfile',
      ext,
      '-out',
      cert,
    ]);
    return tls.createSecureContext({
      key: await fs.readFile(key),
      cert: await fs.readFile(cert),
    });
  }
}

export async function runMockInterceptionCanary(): Promise<boolean> {
  const url = 'https://quark-canary.invalid/health';
  const proxy = await startMockProxy([
    {
      request: { method: 'GET', url },
      response: { status: 200, body: { isolated: true } },
      times: 2,
    },
  ]);
  const env = {
    PATH: process.env['PATH'] ?? '',
    HTTP_PROXY: proxy.url,
    HTTPS_PROXY: proxy.url,
    http_proxy: proxy.url,
    https_proxy: proxy.url,
    NODE_USE_ENV_PROXY: '1',
    NODE_EXTRA_CA_CERTS: proxy.caFile,
    REQUESTS_CA_BUNDLE: proxy.caFile,
    SSL_CERT_FILE: proxy.caFile,
  };
  try {
    await execFileAsync(
      'node',
      [
        '-e',
        `fetch('${url}').then(r=>{if(r.status!==200)process.exit(1)}).catch(()=>process.exit(1))`,
      ],
      { env, timeout: 5_000 },
    );
    await execFileAsync(
      'python3',
      [
        '-c',
        `import urllib.request; assert urllib.request.urlopen('${url}', timeout=3).status == 200`,
      ],
      { env, timeout: 5_000 },
    );
    return (await proxy.stop()).length === 0;
  } catch {
    await proxy.stop().catch(() => []);
    return false;
  }
}

function absoluteUrl(request: http.IncomingMessage): string {
  const value = request.url ?? '/';
  if (/^https?:\/\//i.test(value)) return value;
  return `http://${request.headers.host ?? ''}${value}`;
}

function normalizeUrl(value: string): string {
  return new URL(value).toString();
}

async function openssl(args: string[]): Promise<void> {
  await execFileAsync('openssl', args, { timeout: 10_000 });
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
