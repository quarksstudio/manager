import { publishPackage } from '../src/index';
import {
  configureRegistry,
  uploadPackageArchive,
} from '@quarks.studio/registry/upload';

jest.mock('react', () => {
  throw new Error('Headless publication must not load React');
});
jest.mock('ink', () => {
  throw new Error('Headless publication must not load Ink');
});

describe('headless public API', () => {
  afterEach(() => {
    configureRegistry('');
    jest.restoreAllMocks();
  });

  it('loads the real publisher and rejects a missing source without UI', async () => {
    await expect(
      publishPackage({ sourceDir: '/dev/null/missing-skill', dryRun: true }),
    ).rejects.toThrow();
  });

  it('configures and invokes the real upload transport without UI', async () => {
    configureRegistry('https://registry.test/api');
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
