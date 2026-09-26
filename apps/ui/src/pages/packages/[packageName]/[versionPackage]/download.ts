import type { APIRoute } from 'astro';
import { registry, statusFor } from '../../../../lib/registry';
export const GET: APIRoute = async ({ params, cookies }) => {
  try {
    const upstream = await registry(cookies).Packages.downloadBundle(
      decodeURIComponent(params.packageName!),
      decodeURIComponent(params.versionPackage!),
    );
    const headers = new Headers();
    for (const key of ['content-type', 'content-disposition']) {
      const value = upstream.headers.get(key);
      if (value) headers.set(key, value);
    }
    return new Response(upstream.body, { headers });
  } catch (error) {
    return new Response('Download unavailable', {
      status: statusFor(error, cookies),
    });
  }
};
