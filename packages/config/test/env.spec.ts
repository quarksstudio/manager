import { DEFAULT_CONFIG, SECRET_KEYS } from '../src/domain/config';
import { camelize, envOverrides } from '../src/domain/env';

declare global {
  var __QUARK_ENV__: Record<string, string> | undefined;
}

const previousEnv = { ...process.env };

afterEach(() => {
  process.env = { ...previousEnv };
});

function withEnv(values: Record<string, string | undefined>) {
  return envOverrides({ ...previousEnv, ...values });
}

describe('environment overlay', () => {
  it('derives configuration keys by stripping the QUARK_ prefix', () => {
    expect(camelize('REGISTRY')).toBe('registry');
    expect(camelize('LOCAL_STORAGE_PUBLIC_URL')).toBe('localStoragePublicUrl');
    expect(envOverrides({ QUARK_EDITOR: 'vim', QUARKS_ENV: 'local' })).toEqual({
      editor: 'vim',
      env: 'local',
    });
  });

  it('ignores the removed environment name even when both names are set', () => {
    expect(envOverrides({ QUARK_ENV: 'local' })).toEqual({});
    expect(
      envOverrides({ QUARK_ENV: 'local', QUARKS_ENV: 'production' }),
    ).toEqual({ env: 'production' });
    expect(
      envOverrides({ QUARKS_ENV: 'local', QUARK_ENV: 'production' }),
    ).toEqual({ env: 'local' });
  });

  it('uses production when no environment override exists', () => {
    expect({ ...DEFAULT_CONFIG, ...envOverrides({}) }.env).toBe('production');
  });

  it('derives the registry endpoint from QUARK_REGISTRY_URL', () => {
    expect(
      withEnv({ QUARK_REGISTRY_URL: 'http://localhost:8080' }).registryUrl,
    ).toBe('http://localhost:8080');
  });

  it('accepts the legacy registry alias', () => {
    expect(
      withEnv({ QUARK_REGISTRY_API_URL: 'http://legacy:8080' }).registryUrl,
    ).toBe('http://legacy:8080');
  });

  it('maps the log level alias and token setting', () => {
    const overrides = withEnv({
      QUARK_LOG_LEVEL: 'verbose',
      QUARK_TOKEN: 'server-token',
    });
    expect(overrides).toMatchObject({
      log: 'verbose',
      token: 'server-token',
    });
  });

  it('coerces booleans and model lists', () => {
    expect(withEnv({ QUARK_COLORS: 'false' }).colors).toBe(false);
    expect(withEnv({ QUARK_COLORS: 'true' }).colors).toBe(true);
    expect(withEnv({ QUARK_IAS: 'gpt-4o, claude ' }).ias).toEqual([
      'gpt-4o',
      'claude',
    ]);
  });

  it('ignores unprefixed, empty, and unknown variables', () => {
    expect(
      withEnv({
        MANAGER_SERVER_TOKEN: 'legacy',
        LOCAL_STORAGE_ENDPOINT: 'http://storage:4443',
        QUARK_EDITOR: '',
        QUARK_NOT_A_SETTING: 'x',
      }),
    ).toEqual({});
  });

  it('drops an invalid log level instead of corrupting the configuration', () => {
    expect(withEnv({ QUARK_LOG_LEVEL: 'debug' }).log).toBeUndefined();
  });

  it('declares every default under a known key', () => {
    for (const key of SECRET_KEYS) expect(DEFAULT_CONFIG).toHaveProperty(key);
  });

  it('merges injected defaults with runtime process variables for SSR', () => {
    globalThis.__QUARK_ENV__ = {
      QUARK_REGISTRY_URL: 'http://built.test/v1',
      QUARKS_ENV: 'local',
    };
    delete process.env['QUARK_REGISTRY_URL'];
    delete process.env['QUARKS_ENV'];
    try {
      const { currentEnv } =
        require('../src/domain/env') as typeof import('../src/domain/env');
      expect(currentEnv()['QUARK_REGISTRY_URL']).toBe('http://built.test/v1');
      process.env['QUARK_REGISTRY_URL'] = 'http://runtime.test/v1';
      expect(currentEnv()['QUARK_REGISTRY_URL']).toBe('http://runtime.test/v1');
    } finally {
      delete globalThis.__QUARK_ENV__;
    }
  });

  describe('bundler-injected environment', () => {
    const original = globalThis.process;

    afterEach(() => {
      Object.defineProperty(globalThis, 'process', {
        value: original,
        configurable: true,
        writable: true,
      });
      jest.resetModules();
    });

    function inBrowser(env: Record<string, string>) {
      jest.resetModules();
      Object.defineProperty(globalThis, 'process', {
        value: undefined,
        configurable: true,
        writable: true,
      });
      globalThis.__QUARK_ENV__ = env;
      return require('../src/domain/env') as typeof import('../src/domain/env');
    }

    afterEach(() => {
      delete (globalThis as { __QUARK_ENV__?: unknown }).__QUARK_ENV__;
    });

    it('reads the variables the bundler defined', () => {
      const { currentEnv, envOverrides } = inBrowser({
        QUARK_EDITOR: 'vim',
        QUARK_REGISTRY_URL: 'http://registry.test/v1',
        QUARKS_ENV: 'local',
      });
      expect(currentEnv()).toMatchObject({ QUARK_EDITOR: 'vim' });
      expect(envOverrides()).toEqual({
        editor: 'vim',
        registryUrl: 'http://registry.test/v1',
        env: 'local',
      });
    });

    it('falls back to an empty source when the bundler defined nothing', () => {
      const { currentEnv, envOverrides } = inBrowser({});
      expect(currentEnv()).toEqual({});
      expect(envOverrides()).toEqual({});
    });
  });
});
