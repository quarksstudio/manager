import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import type {
  createAuditCertification,
  AuditTarget,
  AuditDecision,
} from './application/audit-decision';
export type CertificationServices = Pick<
  ReturnType<typeof createAuditCertification>,
  'registerAuditorPasskey' | 'signAuditDecision'
>;
const ServicesContext = createContext<CertificationServices | null>(null);
export function CertificationProvider({
  services,
  children,
}: {
  services: CertificationServices;
  children: ReactNode;
}) {
  return createElement(ServicesContext.Provider, { value: services }, children);
}
export function useAuditCertification() {
  const services = useContext(ServicesContext);
  if (!services) throw new Error('CertificationProvider is required');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const registerAuditorPasskey = useCallback(
    async (apiBase: string) => {
      setLoading(true);
      setError(null);
      try {
        return await services.registerAuditorPasskey(apiBase);
      } catch (reason) {
        setError(reason);
        throw reason;
      } finally {
        setLoading(false);
      }
    },
    [services],
  );
  const signAuditDecision = useCallback(
    async (apiBase: string, target: AuditTarget, decision: AuditDecision) => {
      setLoading(true);
      setError(null);
      try {
        return await services.signAuditDecision(apiBase, target, decision);
      } catch (reason) {
        setError(reason);
        throw reason;
      } finally {
        setLoading(false);
      }
    },
    [services],
  );
  return { registerAuditorPasskey, signAuditDecision, loading, error };
}
