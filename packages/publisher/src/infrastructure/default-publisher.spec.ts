import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { runSkillTests } from '@quark/tester';
import { pack } from '@quark/targz';
import { publishPackage } from './default-publisher';
import { VerificationFailure } from '../domain/publication';

jest.mock('@quark/tester', () => ({
  runSkillTests: jest.fn(),
  runAgentTests: jest.fn(),
}));
jest.mock('@quark/registry/upload', () => ({
  uploadPackageArchive: jest.fn(),
}));
jest.mock('@quark/targz', () => ({
  pack: jest.fn(),
  parseYaml: JSON.parse,
  stringifyYaml: JSON.stringify,
}));

describe('publishPackage', () => {
  let sourceDir: string;
  beforeEach(async () => {
    jest.clearAllMocks();
    sourceDir = await fs.mkdtemp(path.join(os.tmpdir(), 'quark-publish-test-'));
    await fs.writeFile(
      path.join(sourceDir, 'skill.yml'),
      JSON.stringify({ name: 'demo', version: '1.0.0' }),
    );
  });
  afterEach(async () => {
    jest.restoreAllMocks();
    await fs.rm(sourceDir, { recursive: true, force: true });
  });
  it('stops before writing or packing when verification fails', async () => {
    (runSkillTests as jest.Mock).mockResolvedValue({
      passed: false,
      errors: ['invalid manifest'],
    });
    await expect(publishPackage({ sourceDir })).rejects.toBeInstanceOf(
      VerificationFailure,
    );
    expect(pack).not.toHaveBeenCalled();
    await expect(
      fs.access(path.join(sourceDir, 'skill.lock.yml')),
    ).rejects.toThrow();
  });
  it('creates the snapshot and archive without uploading in dry run', async () => {
    (runSkillTests as jest.Mock).mockResolvedValue({
      passed: true,
      errors: [],
      sha256Hash: 'hash',
      tierAchieved: 'TIER_1',
    });
    (pack as jest.Mock).mockResolvedValue('/tmp/demo.tgz');
    const fetchMock = jest.spyOn(globalThis, 'fetch');
    const result = await publishPackage({ sourceDir, dryRun: true });
    expect(result).toMatchObject({
      archive: '/tmp/demo.tgz',
      passed: true,
      uploaded: false,
    });
    expect(
      JSON.parse(
        await fs.readFile(path.join(sourceDir, 'skill.lock.yml'), 'utf8'),
      ),
    ).toMatchObject({ integrity: 'sha256-hash' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
