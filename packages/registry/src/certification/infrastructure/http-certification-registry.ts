import type {
  AuditDecision,
  AuditTarget,
  CertificationRegistry,
  WebAuthnCeremony,
} from '../application/audit-decision';
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/browser';

/** The post with the token exchange, so a login is not authenticated twice. */
export interface CeremonyTransport {
  post<T>(path: string, body?: unknown): Promise<T>;
}

export function createHttpCertificationRegistry(
  transport: CeremonyTransport,
): CertificationRegistry {
  // Absolute, so the certification service can live behind its own host, and
  // joined on the base rather than appended, so a trailing `/` is harmless.
  const route = (apiBase: string, segments: string[]): string =>
    `${apiBase.replace(/\/+$/, '')}/v1/certifications/${segments
      .map(encodeURIComponent)
      .join('/')}`;

  return {
    registrationOptions: (apiBase) =>
      transport.post<WebAuthnCeremony<PublicKeyCredentialCreationOptionsJSON>>(
        route(apiBase, ['auditor', 'credentials', 'options']),
      ),

    verifyRegistration: (apiBase, ceremony, credential) =>
      transport.post<{ credentialId: string }>(
        route(apiBase, ['auditor', 'credentials', 'verify']),
        { challengeId: ceremony.challengeId, response: credential },
      ),

    decisionOptions: (apiBase, target: AuditTarget, decision: AuditDecision) =>
      transport.post<WebAuthnCeremony<PublicKeyCredentialRequestOptionsJSON>>(
        route(apiBase, [...targetPath(target), 'decision', 'options']),
        decision,
      ),

    recordDecision: (
      apiBase,
      target,
      decision,
      ceremony,
      assertion,
    ) =>
      transport.post<Record<string, unknown>>(
        route(apiBase, [...targetPath(target), 'decision']),
        { ...decision, challengeId: ceremony.challengeId, assertion },
      ),
  };
}

function targetPath({ packageId, versionId, productId }: AuditTarget): string[] {
  return [packageId, versionId, productId];
}
