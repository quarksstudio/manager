import type { AstroCookies } from 'astro';
import { loadConfig } from '@quarks.studio/config';
import {
  createRegistryClient,
  RegistryHttpError,
} from '@quarks.studio/registry/client';

export const sessionCookie = 'quark-session';

/**
 * `loadConfig` is memoized, so awaiting it per request is cheap and guarantees
 * the endpoint comes from the resolved configuration (defaults plus storage,
 * session, and `QUARK_*` variables) rather than from an unresolved default.
 */
export async function registry(cookies: AstroCookies) {
  const { registryUrl } = (await loadConfig()).config;
  return createRegistryClient({
    baseUrl: registryUrl,
    token: cookies.get(sessionCookie)?.value,
  });
}

export function statusFor(error: unknown, cookies: AstroCookies): number {
  if (error instanceof RegistryHttpError) {
    if (error.status === 401) cookies.delete(sessionCookie, { path: '/' });
    return error.status >= 500 ? 502 : error.status;
  }
  return 502;
}

export function packageUrl(name: string, version?: string) {
  return `/packages/${encodeURIComponent(name)}${version ? `/${encodeURIComponent(version)}` : ''}`;
}
