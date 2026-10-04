import { isLogLevel, logger } from '@quarks.studio/logger';

import {
  CONFIG_KEYS,
  type ConfigChanges,
  type ConfigKey,
  type ConfigValue,
} from './config';

export const ENV_PREFIX = 'QUARK_';

/**
 * Environment names that do not follow the `QUARK_<KEY>` convention.
 * `QUARK_REGISTRY_URL` needs no entry: it maps to `registryUrl` by the rule.
 */
const ALIASES: Record<string, ConfigKey> = {
  QUARKS_ENV: 'env',
  QUARK_LOG_LEVEL: 'log',
  QUARK_REGISTRY_API_URL: 'registryUrl',
};

export type EnvSource = Record<string, string | undefined>;

/**
 * Environment injected by the bundler as a plain object literal.
 *
 * The literal `import.meta.env` cannot be used here: this package is compiled
 * to CommonJS for the CLI, where `import.meta` is a syntax error. Every
 * consumer instead pre-resolves `QUARKS_ENV` and the `QUARK_`-prefixed variables
 * and defines this global (see `apps/ui/astro.config.mjs`), which survives both
 * the CommonJS emit and the browser bundle.
 */
declare const __QUARK_ENV__: EnvSource | undefined;

export function camelize(name: string): string {
  return name
    .toLowerCase()
    .replace(/_+([a-z0-9])/g, (_match, character: string) =>
      character.toUpperCase(),
    );
}

export function currentEnv(): EnvSource {
  const injected = typeof __QUARK_ENV__ === 'undefined' ? {} : __QUARK_ENV__;
  return typeof process !== 'undefined' && process.env
    ? { ...injected, ...process.env }
    : injected;
}

function coerce(key: ConfigKey, raw: string): ConfigValue | undefined {
  switch (key) {
    case 'log':
      if (!isLogLevel(raw)) {
        logger.warn(`ignoring invalid log level from the environment: ${raw}`);
        return undefined;
      }
      return raw;
    case 'colors':
      return !['false', '0', 'no', 'off'].includes(raw.toLowerCase());
    case 'ias':
      return raw
        .split(',')
        .map((model) => model.trim())
        .filter(Boolean);
    default:
      return raw;
  }
}

function resolveKey(name: string): string | undefined {
  if (name === 'QUARK_ENV') return undefined;
  const alias = ALIASES[name];
  if (alias) return alias;
  if (!name.startsWith(ENV_PREFIX)) return undefined;
  return camelize(name.slice(ENV_PREFIX.length));
}

/**
 * Overlay `QUARKS_ENV` and `QUARK_`-prefixed settings so callers read
 * one source instead of reaching for `process.env` themselves.
 */
export function envOverrides(source: EnvSource = currentEnv()): ConfigChanges {
  const overrides: ConfigChanges = {};
  for (const [name, raw] of Object.entries(source)) {
    if (raw === undefined || raw === '') continue;
    const key = resolveKey(name);
    if (!key) continue;
    if (!(CONFIG_KEYS as ReadonlyArray<string>).includes(key)) {
      logger.warn(`ignoring unknown Quark configuration key ${name}`);
      continue;
    }
    const value = coerce(key as ConfigKey, raw);
    if (value !== undefined) overrides[key as ConfigKey] = value;
  }
  return overrides;
}
