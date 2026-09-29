import { DEFAULT_CONFIG, SECRET_KEYS } from '../src/domain/config';
import { camelize, envOverrides } from '../src/domain/env';

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
    expect(envOverrides({ QUARK_EDITOR: 'vim', QUARK_ENV: 'local' })).toEqual({
      editor: 'vim',
      env: 'local',
    });
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

  it('maps the log level and token aliases', () => {
    const overrides = withEnv({
      QUARK_LOG_LEVEL: 'verbose',
      QUARK_MANAGER_SERVER_TOKEN: 'server-token',
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
});
