import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

import { ProcessSandbox } from './process-sandbox';

describe('ProcessSandbox HTTP interception', () => {
  let cwd: string;

  beforeEach(async () => {
    cwd = await mkdtemp(join(tmpdir(), 'quark-proxy-test-'));
  });

  afterEach(async () => {
    await rm(cwd, { recursive: true, force: true });
  });

  it.each(['http', 'https'])('intercepts an exact %s mock', async (scheme) => {
    const url = `${scheme}://service.example.test/v1/ticket?id=X1`;
    const result = await new ProcessSandbox().execute({
      command: `node -e "fetch('${url}').then(async r => console.log(JSON.stringify({output:{status:r.status,body:await r.json()}})))"`,
      cwd,
      input: {},
      timeoutMs: 10_000,
      allowNetwork: false,
      httpMocks: [
        {
          request: { method: 'GET', url },
          response: { status: 200, body: { ok: true } },
        },
      ],
    });
    expect(result.output).toEqual({ status: 200, body: { ok: true } });
  });

  it('rejects unused mocks', async () => {
    await expect(
      new ProcessSandbox().execute({
        command: `node -e "console.log(JSON.stringify({output:{ok:true}}))"`,
        cwd,
        input: {},
        timeoutMs: 10_000,
        allowNetwork: false,
        httpMocks: [
          {
            request: { method: 'GET', url: 'https://unused.example.test/' },
            response: { status: 200 },
          },
        ],
      }),
    ).rejects.toThrow('observed 0');
  });
});
