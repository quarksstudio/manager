import type {
  AccountDashboardServices,
  AccountProfile,
  AccountProfileChanges,
  AuthProviderLabel,
  EmailAvailability,
} from '../application/account-dashboard.port';
import type {
  BillingDashboard,
  IntegrationSettings,
  PersonalAccessToken,
} from '../domain/account-dashboard';

/**
 * Deterministic local fixtures behind the account dashboard port. They let the
 * full dashboard render, be exercised and be tested before the server ships the
 * tokens, integrations and billing-status routes. Data is scoped to the
 * created services instance and reset on reload; every create/revoke mutates
 * the in-memory arrays so the interactions behave like a real backend for the
 * lifetime of the page. The widgets show a "Preview" tag.
 */
export function previewAccountProfile(): AccountProfile {
  return {
    id: 'user-preview',
    username: 'alice',
    displayName: 'Alice Preview',
    email: 'alice@quark.local',
    provider: 'google' as AuthProviderLabel,
    linkedEmails: ['alice@quark.local', 'alice.preview@gmail.com'],
    publicEmail: 'alice.preview@gmail.com',
  };
}

function previewTokens(): PersonalAccessToken[] {
  return [
    {
      id: 'tk-1',
      name: 'cli-publish',
      tokenPrefix: '4f2a9c1d7b08',
      scope: 'publish-packages',
      createdAt: '2026-07-01T09:24:00.000Z',
      lastUsedAt: '2026-09-28T14:02:00.000Z',
      expiresAt: '2026-08-01T09:24:00.000Z',
      isRevoked: false,
    },
    {
      id: 'tk-2',
      name: 'readonly-dashboard',
      tokenPrefix: 'a1b2c3d4e5f6',
      scope: 'read-only',
      createdAt: '2026-08-15T10:00:00.000Z',
      lastUsedAt: null,
      expiresAt: '2026-09-15T10:00:00.000Z',
      isRevoked: false,
    },
    {
      id: 'tk-3',
      name: 'audit-bot',
      tokenPrefix: '998877665544',
      scope: 'audit-access',
      createdAt: '2026-06-02T16:40:00.000Z',
      lastUsedAt: '2026-09-01T08:15:00.000Z',
      expiresAt: '2026-07-02T16:40:00.000Z',
      isRevoked: false,
    },
  ];
}

function previewIntegrations(): IntegrationSettings {
  return {
    targets: [
      {
        client: 'claude-desktop',
        enabled: true,
        configPath: '~/.claude/claude_desktop_config.json',
        ssePort: null,
      },
      {
        client: 'vscode',
        enabled: true,
        configPath: '~/.vscode/quark-functions.json',
        ssePort: 8791,
      },
      {
        client: 'cursor',
        enabled: false,
        configPath: '~/.cursor/quark-functions.json',
        ssePort: 8791,
      },
      {
        client: 'gemini',
        enabled: false,
        configPath: null,
        ssePort: 8791,
      },
    ],
    storagePath: '~/.quark/skills/',
  };
}

function previewBilling(): BillingDashboard {
  return {
    subscription: {
      plan: 'pro',
      pro: true,
      amountCents: 2000,
      currency: 'USD',
      renewalDate: '2026-11-03T00:00:00.000Z',
      isPrivateDistributionEnabled: true,
    },
    credits: {
      tier2MonthlyUsed: 0,
      tier2MonthlyLimit: 1,
      standalone: [],
    },
    portalUrl: 'https://billing.stripe.com/session/preview',
  };
}

export function createPreviewAccountDashboardServices(): AccountDashboardServices {
  let profile = previewAccountProfile();
  const tokens = previewTokens();
  let integrationSettings = previewIntegrations();
  const billing = previewBilling();

  return {
    preview: true,
    getProfile: async () => profile,
    updateProfile: async (changes: AccountProfileChanges) => {
      profile = {
        ...profile,
        ...(changes.username !== undefined
          ? { username: changes.username }
          : {}),
        ...(changes.displayName !== undefined
          ? { displayName: changes.displayName }
          : {}),
        ...(changes.linkedEmails !== undefined
          ? { linkedEmails: changes.linkedEmails }
          : {}),
        ...('publicEmail' in changes
          ? { publicEmail: changes.publicEmail }
          : {}),
      };
      return profile;
    },
    checkEmail: async (email: string): Promise<EmailAvailability> => {
      const normalized = email.trim().toLowerCase();
      const taken =
        profile.linkedEmails.some(
          (item) => item.toLowerCase() === normalized,
        ) || profile.email?.toLowerCase() === normalized;
      return { email: normalized, available: !taken };
    },
    listTokens: async () => tokens,
    revokeToken: async (tokenId: string) => {
      const index = tokens.findIndex((token) => token.id === tokenId);
      if (index !== -1) tokens.splice(index, 1);
    },
    getIntegrationSettings: async () => integrationSettings,
    saveIntegrationSettings: async (settings: IntegrationSettings) => {
      integrationSettings = settings;
      return integrationSettings;
    },
    getBilling: async () => billing,
    updatePrivateDistribution: async (enabled: boolean) => {
      billing.subscription = {
        ...billing.subscription,
        isPrivateDistributionEnabled: enabled,
      };
      return billing;
    },
  };
}
