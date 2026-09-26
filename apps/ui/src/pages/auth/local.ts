import type { APIRoute } from 'astro';
import { registry, sessionCookie, statusFor } from '../../lib/registry';
export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
  if (process.env.QUARK_ENV !== 'local')
    return new Response('Not found', { status: 404 });
  const user = String((await request.formData()).get('user'));
  if (!['developer', 'admin', 'security-admin', 'auditor'].includes(user))
    return new Response('Invalid user', { status: 400 });
  try {
    const session = await registry(cookies).Auth.signInWithPassword({
      endpoint: `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST || 'localhost:9099'}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=local`,
      email: `${user}@quark.local`,
      password: 'quark-local-password',
    });
    cookies.set(sessionCookie, session.accessToken, {
      httpOnly: true,
      secure: url.protocol === 'https:',
      sameSite: 'lax',
      path: '/',
      maxAge: 3600,
    });
    return redirect('/', 303);
  } catch (error) {
    return new Response('Login failed', { status: statusFor(error, cookies) });
  }
};
