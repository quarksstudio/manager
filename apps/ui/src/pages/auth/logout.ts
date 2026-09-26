import type { APIRoute } from 'astro';
import { registry, sessionCookie } from '../../lib/registry';
export const POST: APIRoute = async ({ cookies, redirect }) => {
  try {
    await registry(cookies).Auth.logout();
  } catch {
    /* Discard the local session even when the API is unavailable. */
  } finally {
    cookies.delete(sessionCookie, { path: '/' });
  }
  return redirect('/', 303);
};
