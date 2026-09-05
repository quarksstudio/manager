import {
  startAuthentication,
  startRegistration,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/browser';
import { apiFetch } from './lib/api-fetch';

interface Ceremony<T> {
  challengeId: string;
  options: T;
}

export async function registerAuditorPasskey(apiBase: string): Promise<{ credentialId: string }> {
  const ceremony = await apiFetch<Ceremony<PublicKeyCredentialCreationOptionsJSON>>(
    `${apiBase}/v1/certifications/auditor/credentials/options`,
    { method: 'POST' },
  );
  const response = await startRegistration({ optionsJSON: ceremony.options });
  return apiFetch(`${apiBase}/v1/certifications/auditor/credentials/verify`, {
    method: 'POST',
    body: JSON.stringify({ challengeId: ceremony.challengeId, response }),
  });
}

export async function signAuditDecision(
  apiBase: string,
  target: { packageId: string; versionId: string; productId: string },
  decision: { approve: boolean; notes?: string },
): Promise<Record<string, unknown>> {
  const path = [target.packageId, target.versionId, target.productId]
    .map(encodeURIComponent)
    .join('/');
  const ceremony = await apiFetch<Ceremony<PublicKeyCredentialRequestOptionsJSON>>(
    `${apiBase}/v1/certifications/${path}/decision/options`,
    { method: 'POST', body: JSON.stringify(decision) },
  );
  const assertion = await startAuthentication({ optionsJSON: ceremony.options });
  return apiFetch(`${apiBase}/v1/certifications/${path}/decision`, {
    method: 'POST',
    body: JSON.stringify({
      ...decision,
      challengeId: ceremony.challengeId,
      assertion,
    }),
  });
}
