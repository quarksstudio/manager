import { archive } from '../../../../../../tools/test/archive-fixtures';
import {
  auditTarArchive,
  ARCHIVE_LIMITS,
} from '../../../../src/lib/tiers/tier1/archive';

describe('M05/M11: canonical archive identities and resource limits', () => {
  it.each(['./skill.yml', './/skill.yml', 'folder//file', 'folder/./file'])(
    'rejects canonical duplicate %s',
    async (alias) => {
      const original = alias.includes('skill') ? 'skill.yml' : 'folder/file';
      await expect(
        auditTarArchive(archive([{ path: original }, { path: alias }])),
      ).rejects.toThrow('Duplicate archive path');
    },
  );
  it('rejects file-directory aliases', async () => {
    await expect(
      auditTarArchive(
        archive([
          { path: 'skill.yml' },
          { path: 'folder', type: 'Directory' },
          { path: 'folder/' },
        ]),
      ),
    ).rejects.toThrow('Duplicate archive path');
  });
  it.each(['SymbolicLink', 'Link', 'FIFO', 'CharacterDevice', 'BlockDevice'])(
    'rejects unsupported entry type %s',
    async (type) => {
      await expect(
        auditTarArchive(
          archive([
            { path: 'skill.yml' },
            { path: 'special', type: type as 'File' },
          ]),
        ),
      ).rejects.toThrow();
    },
  );
  it.each(['../skill.yml', 'safe/../skill.yml', '/skill.yml', 'C:/skill.yml'])(
    'rejects unsafe path %s',
    async (path) => {
      await expect(auditTarArchive(archive([{ path }]))).rejects.toThrow(
        'Unsafe archive path',
      );
    },
  );
  it('M11: accepts exactly 10000 entries and rejects 10001', async () => {
    const entries = [
      { path: 'skill.yml' },
      ...Array.from({ length: 9999 }, (_, i) => ({ path: `empty-${i}` })),
    ];
    await expect(auditTarArchive(archive(entries))).resolves.toHaveLength(
      10000,
    );
    await expect(
      auditTarArchive(archive([...entries, { path: 'extra' }])),
    ).rejects.toThrow('too many files');
  });
  it('rejects an oversized declared body before decompressing that body', async () => {
    await expect(
      auditTarArchive(
        archive([
          { path: 'skill.yml', size: ARCHIVE_LIMITS.unpackedBytes + 1 },
        ]),
      ),
    ).rejects.toThrow('too large when unpacked');
  });
  it('checks aggregate declared bytes at the exact boundary with tighter limits', async () => {
    const limits = { ...ARCHIVE_LIMITS, unpackedBytes: 10 };
    await expect(
      auditTarArchive(
        archive([
          { path: 'skill.yml', content: '12345' },
          { path: 'file', content: '12345' },
        ]),
        undefined,
        limits,
      ),
    ).resolves.toHaveLength(2);
    await expect(
      auditTarArchive(
        archive([
          { path: 'skill.yml', content: '12345' },
          { path: 'file', content: '123456' },
        ]),
        undefined,
        limits,
      ),
    ).rejects.toThrow('too large when unpacked');
  });
  it('checks expanded tar bytes including headers and padding', async () => {
    const buffer = archive([{ path: 'skill.yml', content: 'x' }]);
    await expect(
      auditTarArchive(buffer, undefined, { ...ARCHIVE_LIMITS, tarBytes: 2048 }),
    ).resolves.toEqual(['skill.yml']);
    await expect(
      auditTarArchive(buffer, undefined, { ...ARCHIVE_LIMITS, tarBytes: 2047 }),
    ).rejects.toThrow('decompressed tar byte limit');
  });
  it('checks compressed bytes at the exact boundary', async () => {
    const buffer = archive([{ path: 'skill.yml' }]);
    await expect(
      auditTarArchive(buffer, undefined, {
        ...ARCHIVE_LIMITS,
        compressedBytes: buffer.length,
      }),
    ).resolves.toEqual(['skill.yml']);
    await expect(
      auditTarArchive(buffer, undefined, {
        ...ARCHIVE_LIMITS,
        compressedBytes: buffer.length - 1,
      }),
    ).rejects.toThrow('compressed byte limit');
  });
  it('checks the expanded path length at its exact limit', async () => {
    const long = 'a/'.repeat(510) + 'file';
    expect(long.length).toBe(1024);
    await expect(
      auditTarArchive(archive([{ path: 'skill.yml' }, { path: long }])),
    ).resolves.toHaveLength(2);
    await expect(
      auditTarArchive(archive([{ path: 'skill.yml' }, { path: long + 'x' }])),
    ).rejects.toThrow('Unsafe archive path');
  });
  it('rejects callers attempting to relax resource limits', async () => {
    await expect(
      auditTarArchive(archive([{ path: 'skill.yml' }]), undefined, {
        ...ARCHIVE_LIMITS,
        files: 10001,
      }),
    ).rejects.toThrow('only be tightened');
  });
});
