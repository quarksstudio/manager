import type { Certification, CertificationStatus } from './certification';

/**
 * The server holds a tier on `queued | running | pending_audit | approved`
 * (`payment-certification.ts:31`). The public API collapses all four into
 * `pending` and also collapses `failed` into `pending`, so the client cannot
 * tell them apart. It locks on both: a failed certification stays locked until
 * it is re-issued.
 */
const HELD: ReadonlySet<CertificationStatus> = new Set(['approved', 'pending']);

/** Mirrors `ExecutionLadder.heldTier`; `0` when the version holds nothing. */
export function heldTier(
  certifications?: readonly Certification[] | null,
): number {
  let held = 0;
  for (const certification of certifications ?? []) {
    if (!HELD.has(certification.status)) continue;
    const rank = Number.parseInt(certification.tier.replace(/\D/g, ''), 10);
    if (Number.isInteger(rank) && rank > held) held = rank;
  }
  return held;
}
