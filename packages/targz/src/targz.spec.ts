import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';

import * as tar from 'tar';

import { check, pack, unpack, validateSchema } from './index';

describe('@quark/targz', () => {
  let workspace: string;
  let source: string;
  let output: string;

  beforeEach(async () => {
    workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'targz-test-'));
    source = path.join(workspace, 'source');
    output = path.join(workspace, 'output');
    await fs.mkdir(path.join(source, 'agents'), { recursive: true });
    await fs.mkdir(path.join(source, 'provider'), { recursive: true });
    await fs.writeFile(path.join(source, 'agents', 'reviewer.md'), 'review');
    await fs.writeFile(path.join(source, 'provider', 'openai.md'), 'openai');
    await fs.writeFile(path.join(source, 'undeclared.txt'), 'exclude me');
    await writeManifest(validManifest());
  });

  afterEach(async () => {
    await fs.rm(workspace, { recursive: true, force: true });
  });

  it('validates, packs and checks a canonical archive', async () => {
    await expect(validateSchema(path.join(source, 'skills.yml'))).resolves.toBe(
      true,
    );

    const archive = await pack(source, output);
    expect(archive).toBe(path.join(output, 'demo-skill-1.2.3.tar.gz'));

    const entries: string[] = [];
    await tar.t({
      file: archive,
      onentry: (entry) => entries.push(entry.path),
    });
    expect(entries.sort()).toEqual(
      ['agents/reviewer.md', 'provider/openai.md', 'skills.yml'].sort(),
    );
    expect(entries).not.toContain('undeclared.txt');

    await expect(
      check(await fs.readFile(archive), {
        name: 'demo-skill',
        version: '1.2.3',
      }),
    ).resolves.toBe(true);
  });

  it('verifies integrity before unpacking into the target', async () => {
    const archive = await pack(source, output);
    const buffer = await fs.readFile(archive);
    const hash = `sha256-${createHash('sha256')
      .update(buffer)
      .digest('base64')}`;
    const target = path.join(workspace, 'installed');

    await unpack(buffer, hash, target);

    await expect(
      fs.readFile(path.join(target, 'skills.yml'), 'utf8'),
    ).resolves.toContain('demo-skill');
    await expect(
      fs.readFile(path.join(target, 'agents', 'reviewer.md'), 'utf8'),
    ).resolves.toBe('review');
    await expect(
      fs.stat(path.join(target, 'undeclared.txt')),
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('rejects a hash mismatch before creating the target', async () => {
    const archive = await pack(source, output);
    const target = path.join(workspace, 'installed');

    await expect(unpack(archive, '0'.repeat(64), target)).rejects.toThrow(
      'Archive integrity mismatch',
    );
    await expect(fs.stat(target)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('rejects missing fields, wildcards and missing mapped sources', async () => {
    await writeManifest(`
name: demo
version: 1.0.0
files:
  ".":
    agents: {}
`);
    await expect(
      validateSchema(path.join(source, 'skills.yml')),
    ).rejects.toThrow('description must be a non-empty string');

    await writeManifest(
      validManifest().replace(': "agents/reviewer.md"', ': "agents/*.md"'),
    );
    await expect(pack(source, output)).rejects.toThrow(
      'Wildcards are not allowed',
    );

    await writeManifest(
      validManifest().replace(
        ': "agents/reviewer.md"',
        ': "agents/missing.md"',
      ),
    );
    await expect(pack(source, output)).rejects.toThrow(
      'Mapped source file does not exist',
    );
  });

  it('rejects a mismatched archive identity', async () => {
    const archive = await pack(source, output);

    await expect(
      check(await fs.readFile(archive), {
        name: 'another-skill',
        version: '1.2.3',
      }),
    ).rejects.toThrow('Archive identity mismatch');
  });

  it('audits traversal paths before extraction', async () => {
    const unsafeRoot = path.join(workspace, 'unsafe-source');
    await fs.mkdir(unsafeRoot);
    await fs.writeFile(path.join(unsafeRoot, 'payload'), 'unsafe');
    const archive = path.join(workspace, 'unsafe.tar.gz');
    await tar.c({ cwd: unsafeRoot, file: archive, gzip: true, prefix: '../' }, [
      'payload',
    ]);
    const buffer = await fs.readFile(archive);
    const hash = createHash('sha256').update(buffer).digest('hex');

    await expect(
      unpack(buffer, hash, path.join(workspace, 'unsafe-target')),
    ).rejects.toThrow('Unsafe archive path');
    await expect(
      fs.stat(path.join(workspace, 'payload')),
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('rejects symbolic links before extraction', async () => {
    const linkRoot = path.join(workspace, 'link-source');
    await fs.mkdir(linkRoot);
    await fs.writeFile(path.join(linkRoot, 'skills.yml'), validManifest());
    await fs.symlink('skills.yml', path.join(linkRoot, 'linked.yml'));
    const archive = path.join(workspace, 'link.tar.gz');
    await tar.c({ cwd: linkRoot, file: archive, gzip: true }, [
      'skills.yml',
      'linked.yml',
    ]);
    const buffer = await fs.readFile(archive);

    await expect(
      check(buffer, { name: 'demo-skill', version: '1.2.3' }),
    ).rejects.toThrow('Archive links are not allowed');
  });

  async function writeManifest(content: string): Promise<void> {
    await fs.writeFile(path.join(source, 'skills.yml'), content.trimStart());
  }
});

function validManifest(): string {
  return `
name: demo-skill
version: 1.2.3
description: Example skill
files:
  ".":
    agents:
      ".agents/reviewer.md": "agents/reviewer.md"
  openai:
    agents:
      "agents/openai.md": "provider/openai.md"
dependencies:
  shared-skill: "^2.0.0"
`;
}
