import { Provadier, ProvadierName } from '@quark/types/client';

const BASE = 'https://identitytoolkit.googleapis.com/v1';

export async function me(this: any): Promise<any> {
  return this._fetch(`me`);
}

export async function logout(this: any): Promise<any> {
  return this._fetch(`logout`, { method: 'POST' });
}

export async function getUrlLogin(
  this: any,
  providerId: ProvadierName,
  continueUri: string,
): Promise<string> {
  const valor = Provadier[providerId];

  if (!valor || !providerId) {
    throw new Error('Invalid provadier');
  }
  const res = await fetch(
    `${BASE}/accounts:createAuthUri?key=${process.env['QUARK_GCP_KEY']}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        providerId: valor,
        continueUri,
      }),
    },
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message ?? 'Error to create url');
  }

  return data.authUri;
}
