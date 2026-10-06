import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createExecutionSnapshot } from '../../src/lib/snapshot';
describe('immutable execution package', () => {
  let root: string;
  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'execution-snapshot-'));
  });
  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });
  it('continues using its copied entrypoint and dependencies after the installed package is replaced', () => {
    const entry = path.join(root, 'entry.cjs');
    fs.writeFileSync(entry, 'original');
    fs.writeFileSync(path.join(root, 'dependency.cjs'), 'original-dependency');
    const snapshot = createExecutionSnapshot(root, entry);
    try {
      fs.renameSync(entry, path.join(root, 'old.cjs'));
      fs.symlinkSync('/etc/passwd', entry);
      fs.writeFileSync(path.join(root, 'dependency.cjs'), 'changed');
      expect(fs.readFileSync(snapshot.entrypoint, 'utf8')).toBe('original');
      expect(
        fs.readFileSync(path.join(snapshot.root, 'dependency.cjs'), 'utf8'),
      ).toBe('original-dependency');
    } finally {
      snapshot.dispose();
    }
  });
  it('rejects external symlinks and hardlinks during copying', () => {
    const entry = path.join(root, 'entry.cjs');
    fs.writeFileSync(entry, 'fixture');
    const link = path.join(root, 'linked');
    fs.symlinkSync('/etc/passwd', link);
    expect(() => createExecutionSnapshot(root, entry)).toThrow();
    fs.unlinkSync(link);
    fs.linkSync(entry, link);
    expect(() => createExecutionSnapshot(root, entry)).toThrow('links');
  });
});
