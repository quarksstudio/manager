import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/browser';

export interface WebAuthnCeremony<T> {
  challengeId: string;
  options: T;
}

export interface AuditTarget {
  packageId: string;
  versionId: string;
  productId: string;
}

export interface AuditDecision {
  approve: boolean;
  notes?: string;
}

/** The server half of the S4 ceremony: a one-shot challenge, then a verdict. */
export interface CertificationRegistry {
  registrationOptions(
    apiBase: string,
  ): Promise<WebAuthnCeremony<PublicKeyCredentialCreationOptionsJSON>>;
  verifyRegistration(
    apiBase: string,
    ceremony: WebAuthnCeremony<PublicKeyCredentialCreationOptionsJSON>,
    credential: unknown,
  ): Promise<{ credentialId: string }>;
  decisionOptions(
    apiBase: string,
    target: AuditTarget,
    decision: AuditDecision,
  ): Promise<WebAuthnCeremony<PublicKeyCredentialRequestOptionsJSON>>;
  recordDecision(
    apiBase: string,
    target: AuditTarget,
    decision: AuditDecision,
    ceremony: WebAuthnCeremony<PublicKeyCredentialRequestOptionsJSON>,
    assertion: unknown,
  ): Promise<Record<string, unknown>>;
}

/**
 * The platform authenticators. These two are the only calls in the package that
 * touch key material, and they do so without any private key ever entering
 * JavaScript.
 */
export interface WebAuthnDriver {
  register(optionsJSON: PublicKeyCredentialCreationOptionsJSON): Promise<unknown>;
  authenticate(
    optionsJSON: PublicKeyCredentialRequestOptionsJSON,
  ): Promise<unknown>;
}

export interface AuditDependencies {
  registry: CertificationRegistry;
  webauthn: WebAuthnDriver;
}

/** The route a target's decision ceremony lives under. */
function targetPath({ packageId, versionId, productId }: AuditTarget): string {
  return [packageId, versionId, productId].map(encodeURIComponent).join('/');
}

export function createAuditCertification({
  registry,
  webauthn,
}: AuditDependencies) {
  async function registerAuditorPasskey(
    apiBase: string,
  ): Promise<{ credentialId: string }> {
    const ceremony = await registry.registrationOptions(apiBase);
    const credential = await webauthn.register(ceremony.options);
    return registry.verifyRegistration(apiBase, ceremony, credential);
  }

  async function signAuditDecision(
    apiBase: string,
    target: AuditTarget,
    decision: AuditDecision,
  ): Promise<Record<string, unknown>> {
    const ceremony = await registry.decisionOptions(apiBase, target, decision);
    const assertion = await webauthn.authenticate(ceremony.options);
    return registry.recordDecision(
      apiBase,
      target,
      decision,
      ceremony,
      assertion,
    );
  }

  return { registerAuditorPasskey, signAuditDecision, targetPath };
}
