import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';

import { evaluateSkillAssertion } from './assertions';

describe('file assertions', () => {
  let root: string;
  beforeEach(async () => { root = await fs.mkdtemp(path.join(os.tmpdir(), 'assertion-spec-')); await fs.mkdir(path.join(root, 'outputs')); });
  afterEach(async () => { await fs.rm(root, { recursive: true, force: true }); });

  it('validates exact hashes and rejects mismatches', async () => {
    const data = Buffer.from('deterministic');
    await fs.writeFile(path.join(root, 'outputs', 'result.bin'), data);
    await expect(evaluateSkillAssertion({ type: 'file_created', path: 'outputs/result.bin', max_bytes: 100, sha256: createHash('sha256').update(data).digest('hex') }, {}, root)).resolves.toBe('outputs/result.bin');
    await expect(evaluateSkillAssertion({ type: 'file_created', path: 'outputs/result.bin', max_bytes: 100, sha256: '0'.repeat(64) }, {}, root)).rejects.toThrow('SHA-256 mismatch');
  });

  it('rejects traversal paths', async () => {
    await expect(evaluateSkillAssertion({ type: 'file_match', path: '../audit.log', content_regex: 'x' }, {}, root)).rejects.toThrow('Path escapes package root');
  });
});
