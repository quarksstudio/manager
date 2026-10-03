import type { APIRoute } from 'astro';
import { loadConfig } from '@quarks.studio/config';
import {
  createRegistryClient,
  RegistryHttpError,
} from '@quarks.studio/registry/client';
import { sessionCookie } from '../../lib/registry';
export const GET: APIRoute = async ({ request, cookies, url }) => {
  const headers = {
    'Cache-Control': 'private, no-store',
    'Content-Type': 'application/json',
  };
  const authorization = request.headers.get('Authorization');
  const token = authorization?.startsWith('Bearer ')
    ? authorization.slice(7)
    : cookies.get(sessionCookie)?.value;
  if (!token)
    return new Response(
      JSON.stringify({ error: 'Sign in to view your payments' }),
      { status: 401, headers },
    );
  const limitText = url.searchParams.get('limit');
  const limit = limitText === null ? undefined : Number(limitText);
  if (
    limit !== undefined &&
    (!Number.isInteger(limit) || limit < 1 || limit > 100)
  )
    return new Response(JSON.stringify({ error: 'Invalid limit' }), {
      status: 400,
      headers,
    });
  try {
    const { config } = await loadConfig();
    const client = createRegistryClient({ baseUrl: config.registryUrl, token });
    const page = await client.Gateway.listPayments({
      limit,
      cursor: url.searchParams.get('cursor') ?? undefined,
    });
    return new Response(JSON.stringify(page), { headers });
  } catch (reason) {
    const status = reason instanceof RegistryHttpError ? reason.status : 502;
    return new Response(JSON.stringify({ error: 'Could not load payments' }), {
      status,
      headers,
    });
  }
};
