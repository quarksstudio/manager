import type { CertificationResult, CertificationTier, RunnerDependencies } from '../types';
export interface CertificationEvidence {
    paymentId?: string;
    timestampToken?: string;
    auditorSignature?: string;
    keyId?: string;
}
export declare function collectEvidence(tier: CertificationTier, result: CertificationResult, dependencies: RunnerDependencies, audit?: unknown): Promise<CertificationEvidence>;
export declare function writeLockfile(root: string, result: CertificationResult, evidence: CertificationEvidence, certifiedAt: Date): Promise<void>;
export declare function canonicalBytes(result: CertificationResult): Buffer;
