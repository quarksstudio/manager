import { promises as fs } from 'fs';
import os from 'os';
import * as path from 'path';

const mockStorage = { setItem: jest.fn(), removeItem: jest.fn() };
jest.mock('@quarks.studio/use-storage', () => ({
  createStorage: () => mockStorage,
}));

describe('configuration persistence', () => {
  let root: string;
  let repository: typeof import('../src/lib/config-repository');
  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'quark-config-test-'));
    jest.spyOn(os, 'homedir').mockReturnValue(root);
    jest.resetModules();
    repository = await import('../src/lib/config-repository');
    jest.clearAllMocks();
  });
  afterEach(async () => {
    jest.restoreAllMocks();
    await fs.rm(root, { recursive: true, force: true });
  });
  it('initializes a missing file in an existing configuration directory', async () => {
    await fs.mkdir(repository.CONFIG_DIR, { recursive: true });
    const loaded = await repository.loadConfig();
    expect(loaded.config['colors']).toBe(true);
    expect(await fs.readFile(repository.CONFIG_FILE, 'utf8')).toContain(
      'log=silent',
    );
  });
  it('migrates a legacy token out of the INI file', async () => {
    await fs.mkdir(repository.CONFIG_DIR, { recursive: true });
    await fs.writeFile(
      repository.CONFIG_FILE,
      'token=legacy\ncolors=false\nias=model\n',
    );
    const loaded = await repository.loadConfig();
    expect(mockStorage.setItem).toHaveBeenCalledWith('auth:session', {
      accessToken: 'legacy',
    });
    expect(loaded.config).toMatchObject({
      token: '',
      colors: false,
      ias: ['model'],
    });
    expect(await fs.readFile(repository.CONFIG_FILE, 'utf8')).not.toContain(
      'legacy',
    );
  });
  it('preserves existing values while updating and clears tokens through session storage', async () => {
    await repository.writeConfig({ editor: 'vim' });
    await repository.writeConfig({ log: 'verbose', token: '' });
    const loaded = await repository.loadConfig();
    expect(loaded.config).toMatchObject({ editor: 'vim', log: 'verbose' });
    expect(mockStorage.removeItem).toHaveBeenCalledWith('auth:session');
    expect(await fs.readFile(repository.CONFIG_FILE, 'utf8')).not.toContain(
      'token=',
    );
  });
  it('rejects an invalid log level', async () => {
    await fs.mkdir(repository.CONFIG_DIR, { recursive: true });
    await expect(repository.writeConfig({ log: 'debug' })).rejects.toThrow(
      /Expected one of: silent, error, warn, notice, http, info, verbose, silly/,
    );
  });
  it('falls back to silent for a legacy invalid log value', async () => {
    await fs.mkdir(repository.CONFIG_DIR, { recursive: true });
    await fs.writeFile(repository.CONFIG_FILE, 'log=debug\ncolors=false\n');
    const loaded = await repository.loadConfig();
    expect(loaded.config['log']).toBe('silent');
    await expect(
      repository.writeConfig({ colors: true }),
    ).resolves.toMatchObject({
      log: 'silent',
    });
  });
});
