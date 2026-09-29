import { DEFAULT_CONFIG } from '../src/domain/config';

const values = new Map<string, unknown>();
const mockStorage = {
  getItem: jest.fn(async (key: string) => values.get(key) ?? null),
  setItem: jest.fn(async (key: string, value: unknown) => {
    values.set(key, value);
  }),
  removeItem: jest.fn(async (key: string) => {
    values.delete(key);
  }),
};

jest.mock('@quarks.studio/use-storage/storage', () => ({
  createStorage: () => mockStorage,
}));

const previousEnv = { ...process.env };

describe('configuration resolution', () => {
  let repository: typeof import('../src/lib/config-repository');
  beforeEach(async () => {
    values.clear();
    process.env = { ...previousEnv };
    jest.resetModules();
    repository = await import('../src/lib/config-repository');
    repository.resetConfig();
  });
  afterEach(() => {
    process.env = { ...previousEnv };
    repository.resetConfig();
  });

  it('falls back to the defaults on a fresh install', async () => {
    const { config, sources } = await repository.loadConfig();
    expect(config).toEqual({ ...DEFAULT_CONFIG, ias: [...DEFAULT_CONFIG.ias] });
    expect(sources['editor']).toBe('default');
  });

  it('resolves the registry endpoint from a QUARK_ variable', async () => {
    process.env['QUARK_REGISTRY_URL'] = 'http://localhost:8080';
    const { config } = await repository.loadConfig();
    expect(config.registryUrl).toBe('http://localhost:8080');
    expect(repository.getConfig().registryUrl).toBe('http://localhost:8080');
  });

  it('lets the environment override persisted values', async () => {
    await repository.writeConfig({
      editor: 'vim',
      registryUrl: 'http://saved:8080',
    });
    process.env['QUARK_REGISTRY_URL'] = 'http://env:8080';
    const { config, sources } = await repository.reloadConfig();
    expect(config.editor).toBe('vim');
    expect(config.registryUrl).toBe('http://env:8080');
    expect(sources['editor']).toBe('persisted');
    expect(sources['registryUrl']).toBe('env');
  });

  it('reads the access token from the session', async () => {
    await repository.writeConfig({ token: 'from-login' });
    repository.resetConfig();
    const { config, sources } = await repository.loadConfig();
    expect(config.token).toBe('from-login');
    expect(sources['token']).toBe('session');
  });
  it('prefers QUARK_TOKEN over the stored session', async () => {
    await repository.writeConfig({ token: 'stored' });
    process.env['QUARK_TOKEN'] = 'from-env';
    const { config } = await repository.reloadConfig();
    expect(config.token).toBe('from-env');
  });

  it('signs out when the token is cleared', async () => {
    await repository.writeConfig({ token: 'stored' });
    const config = await repository.writeConfig({ token: '' });
    expect(config.token).toBe('');
    expect(values.has('auth:session')).toBe(false);
  });

  it('never persists credentials', async () => {
    process.env['QUARK_TOKEN'] = 'env-token';
    await repository.writeConfig({ editor: 'nano' });
    const stored = values.get('config') as Record<string, unknown>;
    expect(stored).toMatchObject({ editor: 'nano' });
    expect(stored).not.toHaveProperty('token');
  });

  it('rejects an unknown key', async () => {
    await expect(repository.setConfigValue('nope', 'x')).rejects.toThrow(
      /Unknown configuration key/,
    );
    await expect(repository.setConfigValue('authKey', 'x')).rejects.toThrow(
      /Unknown configuration key/,
    );
  });

  it('validates the log level on write', async () => {
    await expect(
      repository.writeConfig({ log: 'loud' as never }),
    ).rejects.toThrow(/Expected one of: silent/);
  });

  it('coerces values that arrive as strings from the CLI', async () => {
    const config = await repository.setConfigValue('colors', 'false');
    expect(config.colors).toBe(false);
    expect(repository.getConfig().colors).toBe(false);
  });

  it('picks up a session written after the first load', async () => {
    expect((await repository.loadConfig()).config.token).toBe('');
    const store = await import('../src/lib/store');
    await store.saveSession({ accessToken: 'logged-in-later' });
    expect((await repository.loadConfig()).config.token).toBe(
      'logged-in-later',
    );
    await store.clearSession();
    expect((await repository.loadConfig()).config.token).toBe('');
  });

  it('shares a single read between concurrent callers', async () => {
    const [first, second] = await Promise.all([
      repository.loadConfig(),
      repository.loadConfig(),
    ]);
    expect(first).toBe(second);
  });

  it('memoizes until the configuration is explicitly reloaded', async () => {
    const first = await repository.loadConfig();
    values.set('config', { ...DEFAULT_CONFIG, editor: 'emacs' });
    expect((await repository.loadConfig()).config.editor).toBe(
      first.config.editor,
    );
    const reloaded = await repository.reloadConfig();
    expect(reloaded.config.editor).toBe('emacs');
  });

  it('persists the endpoint so it survives a restart', async () => {
    await repository.setConfigValue('registryUrl', 'http://chosen:8080');
    repository.resetConfig();
    const { config, sources } = await repository.loadConfig();
    expect(config.registryUrl).toBe('http://chosen:8080');
    expect(sources['registryUrl']).toBe('persisted');
  });
});
