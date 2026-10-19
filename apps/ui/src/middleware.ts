import { defineMiddleware } from 'astro:middleware';
export const onRequest = defineMiddleware(async (context, next) => {
  if (
    context.url.pathname === '/api' ||
    context.url.pathname.startsWith('/api/')
  ) {
    return new Response('Not Found', { status: 404 });
  }
  try {
    for (const value of Object.values(context.params))
      decodeURIComponent(value ?? '');
  } catch {
    return new Response('Invalid URL encoding', { status: 400 });
  }
  if (
    !['GET', 'HEAD', 'OPTIONS'].includes(context.request.method) &&
    context.request.headers.get('origin') !== context.url.origin
  ) {
    return new Response('Forbidden origin', { status: 403 });
  }
  if (!['GET', 'HEAD', 'OPTIONS'].includes(context.request.method)) {
    return new Response('This route does not accept mutations', {
      status: 403,
    });
  }
  const response = await next();
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
});
