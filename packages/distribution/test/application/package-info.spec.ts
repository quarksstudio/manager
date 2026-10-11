import { loadPackageInfo } from '../../src/application/package-info';

const pkg = {
  summary: 'A useful skill',
  authors: ['alice', 'bob'],
  latestVersion: '2.0.0',
  versions: [
    {
      version: '1.0.0',
      description: '# Older README',
      dist: { sha256: null, sizeBytes: 1 },
      manifest: { license: 'ISC' },
      certifications: [
        { tier: 'TIER_2', status: 'approved', environment: 'local' },
      ],
    },
    {
      version: '2.0.0',
      description: '# Latest README',
      manifest: { license: 'MIT', dependencies: { first: '1', second: '2' } },
      dist: {
        sha256: null,
        sizeBytes: 1,
        shasum: 'checksum',
        integrity: 'sha512-integrity',
      },
      certifications: [
        { tier: 'TIER_1', status: 'approved' },
        { tier: 'TIER_4', status: 'pending' },
      ],
    },
  ],
};
const services = () => ({
  get: jest.fn().mockResolvedValue(pkg),
  getBundleUrl: (name: string, version: string) =>
    `https://registry.test/package/${encodeURIComponent(name)}/${version}/bundle`,
});

describe('package info', () => {
  it.each(['@scope/demo', '@scope/demo@latest'])(
    'shows latest with metadata for %s',
    async (name) => {
      const client = services();
      const info = await loadPackageInfo(name, client);
      expect(client.get).toHaveBeenCalledWith('@scope/demo');
      expect(info).toMatchObject({
        summary: '@scope/demo@2.0.0 | MIT | deps: 2 | versions: 2',
        heading: 'By latest version',
        authors: ['alice', 'bob'],
        versions: ['2.0.0', '1.0.0'],
        tarball: 'https://registry.test/package/%40scope%2Fdemo/2.0.0/bundle',
        shasum: 'checksum',
        integrity: 'sha512-integrity',
        certification: 'Certified TIER_1',
      });
    },
  );
  it('uses the publication pointer even when a larger semantic version exists', async () => {
    const client = services();
    client.get.mockResolvedValue({ ...pkg, latestVersion: '1.0.0' });
    expect(await loadPackageInfo('demo', client)).toMatchObject({
      heading: 'By latest version',
      description: '# Older README',
    });
  });

  it('shows the requested version and preserves local certification labels', async () => {
    expect(await loadPackageInfo('demo@1.0.0', services())).toMatchObject({
      summary: 'demo@1.0.0 | ISC | deps: 0 | versions: 2',
      heading: 'By version 1.0.0',
      description: '# Older README',
      shasum: 'N/A',
      integrity: 'N/A',
      certification: 'Local simulation TIER_2',
    });
  });
  it('resolves cert to the newest approved version', async () => {
    expect((await loadPackageInfo('demo@cert', services())).heading).toBe(
      'By latest version',
    );
  });
  it('handles a package without versions', async () => {
    expect(
      await loadPackageInfo('demo', { get: async () => ({}) }),
    ).toMatchObject({
      summary: 'demo@N/A | N/A | deps: 0 | versions: 0',
      authors: [],
      versions: [],
      description: 'N/A',
      certification: 'None',
      tarball: 'N/A',
    });
  });
  it('rejects missing explicit and certified versions', async () => {
    await expect(loadPackageInfo('demo@9.0.0', services())).rejects.toThrow(
      'Version not found',
    );
    await expect(
      loadPackageInfo('demo@cert', { get: async () => ({ versions: [] }) }),
    ).rejects.toThrow('Version not found');
  });
  it('propagates registry failures', async () => {
    await expect(
      loadPackageInfo('demo', {
        get: async () => {
          throw new Error('offline');
        },
      }),
    ).rejects.toThrow('offline');
  });
});
