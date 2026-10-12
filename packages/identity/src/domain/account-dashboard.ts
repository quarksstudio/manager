export type TokenScope = 'read-only' | 'publish-packages' | 'audit-access';

/** One registered session credential issued to a CLI, browser or audit client. */
export interface PersonalAccessToken {
  id: string;
  /** Human label the owner gave the session (the API field is `name`). */
  name: string;
  /** Non-secret prefix (a slice of the token digest) shown for recognition. */
  tokenPrefix: string;
  scope: TokenScope;
  /** ISO 8601 instant the token was registered. */
  createdAt: string;
  /** ISO 8601 instant of the latest authenticated use, or `null`. */
  lastUsedAt: string | null;
  /** ISO 8601 instant the credential stops being valid. */
  expiresAt: string;
  /** True once the account revoked it; it is then removed from the list. */
  isRevoked: boolean;
}

export type IntegrationClient =
  'claude-desktop' | 'vscode' | 'cursor' | 'gemini';

/**
 * A local LLM client that receives Quark skills by editing a config file or
 * by subscribing to a loopback SSE port. The paths are host-side defaults the
 * user may override.
 */
export interface IntegrationTarget {
  client: IntegrationClient;
  enabled: boolean;
  /** Absolute or `~` path to the client config (Claude, VS Code, Cursor). */
  configPath: string | null;
  /** Loopback port where skills are served to the client. */
  ssePort: number | null;
}

/** Persisted AI integration mapping and the local skill storage location. */
export interface IntegrationSettings {
  targets: IntegrationTarget[];
  /** Default `~/.quark/skills/`. */
  storagePath: string;
}

export type PlanTier = 'community' | 'pro';

/** The account plan card shown in the Billing tab. */
export interface SubscriptionSnapshot {
  plan: PlanTier;
  pro: boolean;
  /** 0 for Community, the monthly USD price for Pro. */
  amountCents: number;
  currency: string;
  renewalDate: string | null;
  /** Pro-gated ability to host private packages and repositories. */
  isPrivateDistributionEnabled: boolean;
}

/** A standalone certification attempt billed per package (Tiers 3 and 4). */
export interface StandaloneCredit {
  id: string;
  tier: 'TIER_3' | 'TIER_4';
  packageId: string;
  amountCents: number;
  currency: string;
  paidAt: string;
}

/** Certification credits the subscription funds for the current month. */
export interface CreditsBalance {
  /** 0..tier2MonthlyLimit; Pro includes one Tier 2 credit per month. */
  tier2MonthlyUsed: number;
  tier2MonthlyLimit: number;
  standalone: StandaloneCredit[];
}

/** Everything the Billing tab renders. */
export interface BillingDashboard {
  subscription: SubscriptionSnapshot;
  credits: CreditsBalance;
  /** Stripe Customer Portal session, when one is configured. */
  portalUrl: string | null;
}
