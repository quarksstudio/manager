import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import {
  getStorePath,
  loadCatalog,
  saveCatalog,
  getSkillPath,
  isInstalled,
  registerInstall,
} from './local-store';

describe('localStore', () => {
  const tmpDir = path.join(os.tmpdir(), 'quark-store-test-' + Date.now());

  beforeEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('should resolve local store path', () => {
    const storePath = getStorePath(false, tmpDir);
    expect(storePath).toEqual(path.join(tmpDir, '.quark', 'skills'));
  });

  it('should resolve global store path', () => {
    const storePath = getStorePath(true, tmpDir);
    expect(storePath).toEqual(path.join(os.homedir(), '.quark', 'skills'));
  });

  it('should load empty catalog', () => {
    const catalog = loadCatalog(false, tmpDir);
    expect(catalog).toEqual({ schemaVersion: 1, skills: {} });
  });

  it('should save and load catalog', () => {
    const sample = {
      schemaVersion: 1 as const,
      skills: {
        'test@1.0.0': {
          name: 'test',
          version: '1.0.0',
          path: '/tmp/test',
          enabled: true,
          installedAt: '2026-01-01T00:00:00.000Z',
        },
      },
    };
    saveCatalog(sample, false, tmpDir);

    const catalog = loadCatalog(false, tmpDir);
    expect(catalog).toEqual(sample);
  });

  it('should resolve skill path', () => {
    const skillPath = getSkillPath('@foo/bar', '2.0.0', false, tmpDir);
    expect(skillPath).toEqual(
      path.join(tmpDir, '.quark', 'skills', 'foo', 'bar', '2.0.0'),
    );
  });

  it('should install and check status of skills', () => {
    registerInstall('@foo/bar', '2.0.0', false, tmpDir);
    expect(isInstalled('@foo/bar', '2.0.0', false, tmpDir)).toBe(true);
    expect(isInstalled('@foo/bar', '1.0.0', false, tmpDir)).toBe(false);
    expect(
      fs.existsSync(path.join(tmpDir, '.quark', 'skills', 'skill.lock')),
    ).toBe(true);
  });

  it('rejects names and versions that could escape the store', () => {
    expect(() => getSkillPath('../outside', '1.0.0', false, tmpDir)).toThrow(
      'Invalid skill name',
    );
    expect(() => getSkillPath('safe', '../1.0.0', false, tmpDir)).toThrow(
      'Invalid skill version',
    );
  });
});
