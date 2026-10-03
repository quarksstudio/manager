import { createAuditCertification } from '@quarks.studio/certification';
import { createHttpCertificationRegistry } from '@quarks.studio/certification/http';
import { createWebAuthnDriver } from '@quarks.studio/certification/http';
import { createGlobalContext } from './ambient-context';
import type { CeremonyTransport } from '@quarks.studio/certification/http';
import type { AuditDecision, AuditTarget } from '@quarks.studio/certification';

/**
 * The certification routes live on the same registry as everything else, so the
 * ambient transport is the implicit one; the caller supplies the base URL
 * because the certification service is deployed independently of the package
 * operations.
 */
function ceremonyTransport(): CeremonyTransport {
  return {
    post: async <T>(path: string, body?: unknown): Promise<T> => {
      const context = await createGlobalContext();
      return context.fetchJson<T>(path, { method: 'POST', body });
    },
  };
}

function ambientCertification() {
  return createAuditCertification({
    registry: createHttpCertificationRegistry(ceremonyTransport()),
    webauthn: createWebAuthnDriver(),
  });
}

function registerAuditorPasskey(apiBase: string) {
  return ambientCertification().registerAuditorPasskey(apiBase);
}

function signAuditDecision(
  apiBase: string,
  target: AuditTarget,
  decision: AuditDecision,
) {
  return ambientCertification().signAuditDecision(apiBase, target, decision);
}

export { registerAuditorPasskey, signAuditDecision };
