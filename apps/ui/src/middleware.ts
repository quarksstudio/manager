import { defineMiddleware } from 'astro:middleware';
export const onRequest = defineMiddleware(async (context, next) => {
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
  const response = await next();
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
});
