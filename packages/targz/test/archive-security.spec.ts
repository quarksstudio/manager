import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { archive, modernManifest } from '../../../tools/test/archive-fixtures';
import { check, unpack, readArchiveResponse, ARCHIVE_LIMITS } from '../src';

const expected = { name: 'audit', version: '1.0.0' };
describe('M04/M05/M11: archive validation before extraction', () => {
  it.each(['skill.yml', 'agent.yml'])(
    'M04: rejects incomplete %s and accepts the complete format',
    async (filename) => {
      await expect(
        check(
          archive([
            { path: filename, content: 'name: audit\nversion: 1.0.0\n' },
          ]),
          expected,
        ),
      ).rejects.toThrow();
      await expect(
        check(
          archive([
            { path: filename, content: modernManifest },
            { path: 'run.cjs', content: '// fixture' },
          ]),
          expected,
        ),
      ).resolves.toBe(true);
    },
  );
  it.each([
    'description: Audit fixture\n',
    'testCommand: node run.cjs\n',
    'mapper_files:\n  ".":\n    tools:\n      tools/run.cjs: run.cjs\n',
  ])(
    'M04: rejects a missing required field or mappings (%s)',
    async (field) => {
      await expect(
        check(
          archive([
            { path: 'skill.yml', content: modernManifest.replace(field, '') },
            { path: 'run.cjs' },
          ]),
          expected,
        ),
      ).rejects.toThrow();
    },
  );
  it('M04: rejects a missing mapped source', async () => {
    await expect(
      check(
        archive([{ path: 'skill.yml', content: modernManifest }]),
        expected,
      ),
    ).rejects.toThrow();
  });
  it.each(['./skill.yml', './/skill.yml'])(
    'M05: rejects alias %s',
    async (alias) => {
      await expect(
        check(
          archive([
            { path: 'skill.yml', content: modernManifest },
            { path: alias, content: modernManifest },
            { path: 'run.cjs' },
          ]),
          expected,
        ),
      ).rejects.toThrow('Duplicate archive path');
    },
  );
  it('M11: rejects the original excessive entry fixture before creating the unpack target', async () => {
    const buffer = archive([
      { path: 'skill.yml', content: modernManifest },
      { path: 'run.cjs' },
      ...Array.from({ length: 10001 }, (_, i) => ({ path: `empty-${i}` })),
    ]);
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'quark-m11-'));
    try {
      await expect(check(buffer, expected)).rejects.toThrow('too many files');
      const target = path.join(root, 'target');
      await expect(
        unpack(
          buffer,
          createHash('sha256').update(buffer).digest('hex'),
          target,
        ),
      ).rejects.toThrow('too many files');
      await expect(fs.stat(target)).rejects.toMatchObject({ code: 'ENOENT' });
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
  it('M11: rejects oversized downloads from Content-Length and cancels the stream', async () => {
    const cancel = jest.fn();
    const body = new ReadableStream({ cancel });
    await expect(
      readArchiveResponse(
        new Response(body, {
          headers: {
            'content-length': String(ARCHIVE_LIMITS.compressedBytes + 1),
          },
        }),
      ),
    ).rejects.toThrow('compressed byte limit');
    expect(cancel).toHaveBeenCalledTimes(1);
  });
  it('M11: rejects a streaming download exceeding the limit even with a false Content-Length', async () => {
    const reader = {
      read: jest.fn().mockResolvedValue({
        done: false,
        value: { byteLength: ARCHIVE_LIMITS.compressedBytes + 1 },
      }),
      cancel: jest.fn(),
      releaseLock: jest.fn(),
    };
    const response = {
      headers: new Headers({ 'content-length': '1' }),
      body: { getReader: () => reader },
    } as unknown as Response;
    await expect(readArchiveResponse(response)).rejects.toThrow(
      'compressed byte limit',
    );
    expect(reader.cancel).toHaveBeenCalledTimes(1);
    expect(reader.releaseLock).toHaveBeenCalledTimes(1);
  });
  it('M11: preserves a valid download without a declared length', async () => {
    const buffer = archive([
      { path: 'skill.yml', content: modernManifest },
      { path: 'run.cjs' },
    ]);
    expect(
      await readArchiveResponse(new Response(new Uint8Array(buffer))),
    ).toEqual(buffer);
  });
});
