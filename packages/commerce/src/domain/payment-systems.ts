/** `GET /v1/gateway/systems`; `countries: null` means "serves everywhere". */
export interface PaymentSystem {
  id: string;
  name: string;
  countries: string[] | null;
}

export interface PaymentSystems {
  country: string | null;
  source: 'query' | 'ip' | 'unknown';
  systems: PaymentSystem[];
}

/**
 * Which systems can complete a plan signup on their own, and why.
 *
 * The server decides this with `requiresPaymentSource` on its subscription
 * adapters, but `gateway/systems` does not publish the flag, so the capability
 * is declared here. The reason is mandatory: nobody flips a switch without
 * knowing why. Enabling a system is one line and nothing else changes.
 *
 * Today PayPal answers `POST /v1/subscriptions` with an `approvalUrl` and never
 * asks for a payment source. MercadoPago and dLocal Go answer
 * `400 PAYMENT_SOURCE_REQUIRED` without a `paymentSourceId`/`cardToken`, which
 * needs a card-capture flow this client does not have.
 */
const PLAN_SIGNUP: Readonly<Record<string, string>> = {
  paypal:
    'PayPal approves the plan on its own hosted page; no card is stored first.',
};

export function planSignupNote(system: string): string | undefined {
  return PLAN_SIGNUP[system.trim().toLowerCase()];
}

export interface PendingSystem {
  id: string;
  name: string;
  reason: string;
}

export interface PlanSystems {
  /** The only systems a plan may be signed up through. */
  eligible: PaymentSystem[];
  /** Available here, not self-serve yet: a hint, never a choice. */
  pending: PendingSystem[];
}

const PENDING_REASON = 'Needs a stored card before it can be offered here.';

export function partitionPlanSystems(systems: PaymentSystem[]): PlanSystems {
  const eligible: PaymentSystem[] = [];
  const pending: PendingSystem[] = [];
  for (const system of systems) {
    if (planSignupNote(system.id)) {
      eligible.push(system);
    } else {
      pending.push({
        id: system.id,
        name: system.name,
        reason: PENDING_REASON,
      });
    }
  }
  return { eligible, pending };
}
