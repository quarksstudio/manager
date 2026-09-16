import { Provider, ProviderName } from '@quarks.studio/types/client';

const BASE = 'https://identitytoolkit.googleapis.com/v1';

export async function me(this: any): Promise<any> {
  return this._fetch(`auth/me`);
}

export async function logout(this: any): Promise<any> {
  return this._fetch(`auth/logout`, { method: 'POST' });
}

export async function getUrlLogin(
  this: any,
  providerId: ProviderName,
  continueUri: string,
): Promise<string> {
  const value = Provider[providerId];

  if (!value || !providerId) {
    throw new Error('Invalid provider');
  }
  const res = await fetch(
    `${BASE}/accounts:createAuthUri?key=${process.env['QUARK_GCP_KEY']}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        providerId: value,
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
