import type { AccountDashboardServices } from '../application/account-dashboard.port';
import { createPreviewAccountDashboardServices } from './account-dashboard-preview';
import { createHttpAccountProfile } from './http-account-profile';
import { createHttpAccountTokens } from './http-account-tokens';

/**
 * The single composition point for the account settings dashboard. Profile and
 * the token registry are real (`auth/me`, `auth/tokens`); integrations and
 * subscription management are served by the preview adapter until the registry ships
 * those routes. Swap the preview calls for HTTP adapters here without touching
 * the UI.
 */
export function createAccountDashboardServices(
  apiBaseUrl?: string,
): AccountDashboardServices {
  const profile = createHttpAccountProfile(apiBaseUrl);
  const tokens = createHttpAccountTokens(apiBaseUrl);
  const preview = createPreviewAccountDashboardServices();
  return {
    preview: true,
    getProfile: profile.get,
    updateProfile: profile.update,
    checkEmail: profile.checkEmail,
    listTokens: tokens.list,
    revokeToken: tokens.revoke,
    getIntegrationSettings: preview.getIntegrationSettings,
    saveIntegrationSettings: preview.saveIntegrationSettings,
    getBilling: preview.getBilling,
    updatePrivateDistribution: preview.updatePrivateDistribution,
  };
}
