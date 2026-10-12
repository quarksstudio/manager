import type {
  BillingDashboard,
  IntegrationSettings,
  PersonalAccessToken,
  TokenScope,
} from '../domain/account-dashboard';

/** The OAuth surface the identity provider knows about, plus the emulator. */
export type AuthProviderLabel =
  'google' | 'github' | 'twitter' | 'facebook' | 'emulator' | 'oauth';

/**
 * The account identity behind the Profile tab: what the registry publishes and
 * the email selection that governs public author cards and audit stamps.
 */
export interface AccountProfile {
  id: string;
  username: string;
  displayName: string;
  /** The account's primary login email, when the server reports it. */
  email: string | null;
  /** The provider that authenticated the account, when known. */
  provider: AuthProviderLabel | null;
  /** Emails the account can surface publicly (any of them selectable). */
  linkedEmails: string[];
  /** The email shown on published packages, profile cards and stamps. */
  publicEmail: string | null;
}

export interface AccountProfileChanges {
  username?: string;
  displayName?: string;
  linkedEmails?: string[];
  publicEmail?: string | null;
}

/** Result of a uniqueness check on an email the account wants to link. */
export interface EmailAvailability {
  email: string;
  available: boolean;
}

/**
 * The account settings dashboard surface. Profile reads/writes the registry
 * identity; tokens and integrations are exposed through the
 * same port so a host can swap preview adapters for production HTTP adapters
 * without touching the UI.
 */
export interface AccountDashboardServices {
  preview?: boolean;
  getProfile(): Promise<AccountProfile>;
  updateProfile(changes: AccountProfileChanges): Promise<AccountProfile>;
  checkEmail(email: string): Promise<EmailAvailability>;
  listTokens(): Promise<PersonalAccessToken[]>;
  revokeToken(tokenId: string): Promise<void>;
  getIntegrationSettings(): Promise<IntegrationSettings>;
  saveIntegrationSettings(
    settings: IntegrationSettings,
  ): Promise<IntegrationSettings>;
  getBilling(): Promise<BillingDashboard>;
  updatePrivateDistribution(enabled: boolean): Promise<BillingDashboard>;
}

export type { TokenScope };
