import { resetConfig } from '@quarks.studio/config';
import { uploadPackageArchive } from '../src/upload';

import { publishPackage } from '../src/index';

jest.mock('react', () => {
  throw new Error('Headless publication must not load React');
});
jest.mock('ink', () => {
  throw new Error('Headless publication must not load Ink');
});

describe('headless public API', () => {
  afterEach(() => {
    delete process.env['QUARK_REGISTRY_URL'];
    resetConfig();
    jest.restoreAllMocks();
  });

  it('loads the real publisher and rejects a missing source without UI', async () => {
    await expect(
      publishPackage({ sourceDir: '/dev/null/missing-skill', dryRun: true }),
    ).rejects.toThrow();
  });

  it('configures and invokes the real upload transport without UI', async () => {
    process.env['QUARK_REGISTRY_URL'] = 'https://registry.test/api';
    resetConfig();
    const send = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            uploadId: 'test-upload',
            uploadUrl: 'https://storage.test/bundle',
            method: 'PUT',
            headers: { 'Content-Type': 'application/gzip' },
            expiresAt: new Date(Date.now() + 60000).toISOString(),
            maxSizeBytes: 50,
          }),
          { status: 201 },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    await uploadPackageArchive({
      content: new Uint8Array([1]),
      fileName: 'demo.tgz',
      packageName: 'demo',
      version: '1.0.0',
      description: '',
      token: 'test-token',
    });
    expect(send).toHaveBeenCalledWith(
      'https://registry.test/api/package/demo/1.0.0',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
