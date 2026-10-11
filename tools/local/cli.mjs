import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// A regular CLI image needs no server. Compose opts into local authentication.
if (process.env.QUARK_ENV === 'local') {
  const response = await fetch(
    `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=local`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: process.env.LOCAL_USER_EMAIL || 'developer@quark.local',
        password: 'quark-local-password',
        returnSecureToken: true,
      }),
    },
  );
  const auth = await response.json();
  if (!response.ok || !auth.idToken) throw new Error('Local login failed');
  const exchange = await fetch(`${process.env.API_URL}/v1/auth/exchange`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      token: auth.idToken,
      refreshToken: auth.refreshToken,
    }),
  });
  const session = await exchange.json();
  if (!exchange.ok || !session.accessToken)
    throw new Error('Local token exchange failed');
  process.env.QUARK_TOKEN = session.accessToken;
  process.env.QUARK_REGISTRY_URL = `${process.env.API_URL.replace(/\/$/, '')}/v1`;
}
const child = spawn(
  process.execPath,
  [
    fileURLToPath(new URL('./main.js', import.meta.url)),
    ...process.argv.slice(2),
  ],
  {
    stdio: 'inherit',
    env: process.env,
  },
);
child.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
