import { loadEnv } from 'vite';

/** Host adapter: load Astro's dotenv files without exposing server credentials. */
export function loadUiEnvironment(
  mode = process.env.NODE_ENV ?? 'development',
  directory = import.meta.dirname,
) {
  const env = loadEnv(mode, directory, '');
  const browserEnv = Object.fromEntries(
    Object.entries(env).filter(
      ([name]) =>
        name === 'QUARKS_ENV' ||
        (name.startsWith('QUARK_') &&
          name !== 'QUARK_TOKEN' &&
          name !== 'QUARK_ENV'),
    ),
  );
  return {
    browserEnv,
    registryUrl: env.QUARK_REGISTRY_URL || 'https://api.quarks.studio/v1',
    webOrigin: env.WEB_ORIGIN,
  };
}
