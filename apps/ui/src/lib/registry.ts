import type { AstroCookies } from 'astro';
import {
  createRegistryClient,
  RegistryHttpError,
} from '@quarks.studio/registry/client';
export const sessionCookie = 'quark-session';
export function registry(cookies: AstroCookies) {
  return createRegistryClient({
    baseUrl: process.env.REGISTRY_API_URL || 'http://localhost:8081/v1',
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
