import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  AccountDashboardServices,
  AccountProfile,
  AccountProfileChanges,
  EmailAvailability,
} from '../application/account-dashboard.port';
import type {
  BillingDashboard,
  IntegrationSettings,
  PersonalAccessToken,
} from '../domain/account-dashboard';

export interface AccountDashboardState {
  profile: AccountProfile | null;
  profileLoading: boolean;
  profileSaving: boolean;
  profileError: string;
  reloadProfile(): Promise<void>;
  saveProfile(changes: AccountProfileChanges): Promise<boolean>;
  checkEmail(email: string): Promise<EmailAvailability>;

  tokens: PersonalAccessToken[];
  tokensLoading: boolean;
  tokensError: string;
  reloadTokens(): Promise<void>;
  revokeToken(tokenId: string): Promise<void>;

  integrations: IntegrationSettings | null;
  integrationsLoading: boolean;
  integrationsSaving: boolean;
  integrationsError: string;
  reloadIntegrations(): Promise<void>;
  saveIntegrations(settings: IntegrationSettings): Promise<boolean>;

  billing: BillingDashboard | null;
  billingLoading: boolean;
  billingError: string;
  reloadBilling(): Promise<void>;
  setPrivateDistribution(enabled: boolean): Promise<boolean>;
}

const GENERIC_LOAD_ERROR = (what: string) =>
  `Could not load ${what}. Please try again.`;

/**
 * Loads the account identity and the requested account section through the
 * injected `AccountDashboardServices`. Guards follow `useUserSettings`: a
 * request is ignored while the same operation is busy, and stale resolutions
 * are dropped after the hook unmounts or the enabled flag flips. Each section
 * tracks its own latest request so concurrent loads cannot invalidate each
 * other.
 */
export function useAccountDashboard(
  services: AccountDashboardServices,
  enabled: boolean,
  section: 'tokens' | 'integrations' | 'billing',
): AccountDashboardState {
  const mounted = useRef(false);
  const profileRevision = useRef(0);
  const tokensRevision = useRef(0);
  const integrationsRevision = useRef(0);

  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(enabled);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const profileBusy = useRef(false);

  const [tokens, setTokens] = useState<PersonalAccessToken[]>([]);
  const [tokensLoading, setTokensLoading] = useState(false);
  const [tokensError, setTokensError] = useState('');
  const tokensBusy = useRef(false);

  const [integrations, setIntegrations] = useState<IntegrationSettings | null>(
    null,
  );
  const [integrationsLoading, setIntegrationsLoading] = useState(false);
  const [integrationsSaving, setIntegrationsSaving] = useState(false);
  const [integrationsError, setIntegrationsError] = useState('');
  const integrationsBusy = useRef(false);
  const [billing, setBilling] = useState<BillingDashboard | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState('');
  const billingRevision = useRef(0);
  const billingBusy = useRef(false);

  useEffect(() => {
    mounted.current = true;
    setProfileLoading(enabled);
    setProfile(null);
    if (section === 'tokens') setTokens([]);
    if (section === 'integrations') setIntegrations(null);
    if (section === 'billing') setBilling(null);
    if (enabled) {
      void loadProfile();
      if (section === 'tokens') void loadTokens();
      if (section === 'integrations') void loadIntegrations();
      if (section === 'billing') void loadBilling();
    }
    return () => {
      mounted.current = false;
      profileRevision.current += 1;
      tokensRevision.current += 1;
      integrationsRevision.current += 1;
      billingRevision.current += 1;
    };
  }, [enabled, section, services]);

  const loadProfile = useCallback(async () => {
    if (!enabled) return;
    const request = ++profileRevision.current;
    setProfileLoading(true);
    setProfileError('');
    try {
      const value = await services.getProfile();
      if (mounted.current && request === profileRevision.current)
        setProfile(value);
    } catch {
      if (mounted.current && request === profileRevision.current)
        setProfileError(GENERIC_LOAD_ERROR('profile'));
    } finally {
      if (mounted.current && request === profileRevision.current)
        setProfileLoading(false);
    }
  }, [enabled, services]);

  const saveProfile = useCallback(
    async (changes: AccountProfileChanges): Promise<boolean> => {
      if (!enabled || profileBusy.current || !Object.keys(changes).length)
        return false;
      const request = profileRevision.current;
      profileBusy.current = true;
      setProfileSaving(true);
      setProfileError('');
      try {
        const value = await services.updateProfile(changes);
        if (mounted.current && request === profileRevision.current)
          setProfile(value);
        return true;
      } catch (failure) {
        const status =
          typeof failure === 'object' && failure !== null && 'status' in failure
            ? failure.status
            : undefined;
        if (mounted.current && request === profileRevision.current)
          setProfileError(
            status === 400
              ? 'Invalid profile data.'
              : 'Could not save profile. Please try again.',
          );
        return false;
      } finally {
        profileBusy.current = false;
        if (mounted.current) setProfileSaving(false);
      }
    },
    [enabled, services],
  );

  const checkEmail = useCallback(
    (email: string): Promise<EmailAvailability> => services.checkEmail(email),
    [services],
  );

  const loadTokens = useCallback(async () => {
    if (!enabled) return;
    const request = ++tokensRevision.current;
    setTokensLoading(true);
    setTokensError('');
    try {
      const value = await services.listTokens();
      if (mounted.current && request === tokensRevision.current)
        setTokens(value);
    } catch {
      if (mounted.current && request === tokensRevision.current)
        setTokensError(GENERIC_LOAD_ERROR('tokens'));
    } finally {
      if (mounted.current && request === tokensRevision.current)
        setTokensLoading(false);
    }
  }, [enabled, services]);

  const revokeToken = useCallback(
    async (tokenId: string): Promise<void> => {
      if (!enabled || tokensBusy.current) return;
      const request = tokensRevision.current;
      tokensBusy.current = true;
      setTokensError('');
      try {
        await services.revokeToken(tokenId);
        if (mounted.current && request === tokensRevision.current)
          setTokens((current) =>
            current.filter((token) => token.id !== tokenId),
          );
      } catch {
        if (mounted.current && request === tokensRevision.current)
          setTokensError('Could not revoke the token. Please try again.');
      } finally {
        tokensBusy.current = false;
      }
    },
    [enabled, services],
  );

  const loadIntegrations = useCallback(async () => {
    if (!enabled) return;
    const request = ++integrationsRevision.current;
    setIntegrationsLoading(true);
    setIntegrationsError('');
    try {
      const value = await services.getIntegrationSettings();
      if (mounted.current && request === integrationsRevision.current)
        setIntegrations(value);
    } catch {
      if (mounted.current && request === integrationsRevision.current)
        setIntegrationsError(GENERIC_LOAD_ERROR('integrations'));
    } finally {
      if (mounted.current && request === integrationsRevision.current)
        setIntegrationsLoading(false);
    }
  }, [enabled, services]);

  const saveIntegrations = useCallback(
    async (settings: IntegrationSettings): Promise<boolean> => {
      if (!enabled || integrationsBusy.current) return false;
      const request = integrationsRevision.current;
      integrationsBusy.current = true;
      setIntegrationsSaving(true);
      setIntegrationsError('');
      try {
        await services.saveIntegrationSettings(settings);
        if (mounted.current && request === integrationsRevision.current)
          setIntegrations(settings);
        return true;
      } catch {
        if (mounted.current && request === integrationsRevision.current)
          setIntegrationsError(
            'Could not save the integrations. Please try again.',
          );
        return false;
      } finally {
        integrationsBusy.current = false;
        if (mounted.current) setIntegrationsSaving(false);
      }
    },
    [enabled, services],
  );

  const loadBilling = useCallback(async () => {
    if (!enabled) return;
    const request = ++billingRevision.current;
    setBillingLoading(true);
    setBillingError('');
    try {
      const value = await services.getBilling();
      if (mounted.current && request === billingRevision.current)
        setBilling(value);
    } catch {
      if (mounted.current && request === billingRevision.current)
        setBillingError(GENERIC_LOAD_ERROR('billing'));
    } finally {
      if (mounted.current && request === billingRevision.current)
        setBillingLoading(false);
    }
  }, [enabled, services]);

  const setPrivateDistribution = useCallback(
    async (privateEnabled: boolean): Promise<boolean> => {
      if (!enabled || billingBusy.current) return false;
      const request = billingRevision.current;
      billingBusy.current = true;
      setBillingError('');
      try {
        const value = await services.updatePrivateDistribution(privateEnabled);
        if (mounted.current && request === billingRevision.current)
          setBilling(value);
        return true;
      } catch {
        if (mounted.current && request === billingRevision.current)
          setBillingError(
            'Could not update the subscription. Please try again.',
          );
        return false;
      } finally {
        billingBusy.current = false;
      }
    },
    [enabled, services],
  );

  return {
    profile,
    profileLoading,
    profileSaving,
    profileError,
    reloadProfile: loadProfile,
    saveProfile,
    checkEmail,
    tokens,
    tokensLoading,
    tokensError,
    reloadTokens: loadTokens,
    revokeToken,
    integrations,
    integrationsLoading,
    integrationsSaving,
    integrationsError,
    reloadIntegrations: loadIntegrations,
    saveIntegrations,
    billing,
    billingLoading,
    billingError,
    reloadBilling: loadBilling,
    setPrivateDistribution,
  };
}
