import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import type { AccountDashboardServices } from '../../src/application/account-dashboard.port';
import { IntegrationsSettingsDashboard } from '../../src/web/containers/IntegrationsSettingsDashboard';
import { TokensAPISettingsDashboard } from '../../src/web/containers/TokensAPISettingsDashboard';

const profile = {
  id: 'uid',
  username: 'alice',
  displayName: 'Alice Crucifixo',
  email: 'alice@quark.local',
  provider: 'google',
  linkedEmails: ['alice@quark.local'],
  publicEmail: null,
};

const token = {
  id: 'tk-1',
  name: 'cli-publish',
  tokenPrefix: 'pt_',
  scope: 'publish-packages' as const,
  createdAt: '2026-07-01T09:24:00.000Z',
  lastUsedAt: '2026-09-28T14:02:00.000Z',
  expiresAt: '2027-07-01T09:24:00.000Z',
  isRevoked: false,
};

const settings = {
  targets: [
    {
      client: 'claude-desktop' as const,
      enabled: true,
      configPath: '~/.claude/claude_desktop_config.json',
      ssePort: null,
    },
  ],
  storagePath: '~/.quark/skills/',
};

const services = {
  preview: true,
  getProfile: jest.fn(),
  updateProfile: jest.fn(),
  checkEmail: jest.fn(),
  listTokens: jest.fn(),
  revokeToken: jest.fn(),
  getIntegrationSettings: jest.fn(),
  saveIntegrationSettings: jest.fn(),
  getBilling: jest.fn(),
  updatePrivateDistribution: jest.fn(),
} as unknown as AccountDashboardServices;

const navigate = jest.fn();

beforeEach(() => {
  jest.resetAllMocks();
  (services as Record<string, unknown>).preview = true;
  services.getProfile.mockResolvedValue(profile);
  services.listTokens.mockResolvedValue([token]);
  services.revokeToken.mockResolvedValue(undefined);
  services.getIntegrationSettings.mockResolvedValue(settings);
  services.saveIntegrationSettings.mockResolvedValue(true);
});

function showTokens(props: Record<string, unknown> = {}) {
  return render(
    <TokensAPISettingsDashboard
      username="alice"
      services={services}
      authenticated
      onNavigate={navigate}
      {...props}
    />,
  );
}

function showIntegrations(props: Record<string, unknown> = {}) {
  return render(
    <IntegrationsSettingsDashboard
      username="alice"
      services={services}
      authenticated
      onNavigate={navigate}
      {...props}
    />,
  );
}

it('requires authentication and waits for the session before loading tokens', () => {
  const view = showTokens({ authenticated: false, sessionLoading: true });
  expect(services.getProfile).not.toHaveBeenCalled();

  view.rerender(
    <TokensAPISettingsDashboard
      username="alice"
      services={services}
      authenticated={false}
      onNavigate={navigate}
    />,
  );

  expect(
    screen.getByRole('link', { name: 'Sign in' }).getAttribute('href'),
  ).toBe('/login');
  expect(services.getProfile).not.toHaveBeenCalled();
});

it('uses the shared access gate to retry a failed profile load', async () => {
  services.getProfile
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce(profile);
  showIntegrations();

  await screen.findByText('Could not load profile. Please try again.');
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  await screen.findByText('AI integrations');
});

it.each([
  ['tokens', showTokens],
  ['integrations', showIntegrations],
] as const)(
  'redirects the %s dashboard to the canonical username',
  async (_, show) => {
    show({ username: 'someone-else' });

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('alice'));
    expect(screen.getByRole('status').textContent).toContain(
      'Opening your account under @alice',
    );
  },
);

it('loads and revokes tokens on the tokens dashboard', async () => {
  showTokens();

  await screen.findByText('cli-publish');
  expect(screen.getByText('Publish packages')).toBeTruthy();
  expect(services.getIntegrationSettings).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole('button', { name: 'Revoke' }));
  const confirmation = await screen.findByText('Revoke this token?');
  const popup = confirmation.closest('.ant-popconfirm');
  if (!popup) throw new Error('Token revoke popover is missing');
  fireEvent.click(within(popup).getByRole('button', { name: 'Revoke' }));

  await waitFor(() =>
    expect(services.revokeToken).toHaveBeenCalledWith('tk-1'),
  );
});

it('loads and saves settings on the integrations dashboard', async () => {
  showIntegrations();

  await screen.findByLabelText('Skill storage location');
  expect(services.listTokens).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Skill storage location'), {
    target: { value: '~/code/.quark/skills/' },
  });
  fireEvent.click(
    screen.getByRole('button', { name: 'Save integration settings' }),
  );

  await waitFor(() =>
    expect(services.saveIntegrationSettings).toHaveBeenCalledWith({
      ...settings,
      storagePath: '~/code/.quark/skills/',
    }),
  );
  await screen.findByText('Integration settings saved.');
});
