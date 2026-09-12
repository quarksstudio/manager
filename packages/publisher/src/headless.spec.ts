import { publishPackage } from './index';
import {
  configureRegistry,
  uploadPackageArchive,
} from '@quark/registry/upload';

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
      .mockResolvedValue(new Response(null, { status: 201 }));
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
