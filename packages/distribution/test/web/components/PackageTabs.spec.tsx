import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import {
  DistributionProvider,
  type DistributionServices,
} from '../../../src/presentation';
import { PackageTabs } from '../../../src/web';

jest.mock('@quarks.studio/commerce/web', () => ({
  ...jest.requireActual('@quarks.studio/commerce/web'),
  ConfiguredMonthlyTotals: () => <div data-testid="plans" />,
}));

const detail = {
  id: 'demo',
  name: 'demo',
  summary: 'Demo',
  authors: ['alice'],
  tags: ['demo'],
  downloads: 0,
  canEditMetadata: true,
  latestVersion: '1.0.0',
  versions: [
    { version: '1.0.0', description: '', dist: { sha256: null, sizeBytes: 1 } },
  ],
};

const urls = { versions: {}, downloads: {} };

function servicesWith(update = jest.fn().mockResolvedValue({})) {
  const services: DistributionServices = {
    downloadBundle: jest.fn(),
    getCurrentUser: jest.fn().mockResolvedValue({ id: 'alice' }),
    get: jest.fn(),
    getVersion: jest.fn(),
    update,
  };
  return { services, update };
}

it('gives authors a configuration tab that saves from the browser', async () => {
  const { services, update } = servicesWith();
  render(
    <DistributionProvider services={services}>
      <PackageTabs
        packageName="demo"
        detail={detail}
        selectedVersion="1.0.0"
        urls={urls}
      />
    </DistributionProvider>,
  );
  expect(screen.getByRole('tab', { name: 'Configuración' })).toBeTruthy();
  expect(screen.getByRole('tab', { name: 'Suscripciones' })).toBeTruthy();
  // The server props are on screen before the editor seeds itself.
  expect(screen.queryByLabelText('Descripción')).toBeNull();
  expect(screen.getByTestId('member-alice')).toBeTruthy();
  // Tags are no longer edited from the configuration tab.
  expect(screen.queryByTestId('tag-demo')).toBeNull();
  // The panel is a browser island: it never posts to the package route.
  expect(screen.getByTestId('plans')).toBeTruthy();
  expect(screen.getByTestId('run-certification')).toBeTruthy();

  await act(async () => {
    await Promise.resolve();
  });
  fireEvent.click(screen.getByRole('tab', { name: 'Configuración' }));
  const input = screen.getByLabelText('Nuevo miembro');
  fireEvent.change(input, { target: { value: 'bob' } });
  fireEvent.click(screen.getByRole('button', { name: 'Añadir miembro' }));
  expect(await screen.findByTestId('member-bob')).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
  expect(update).toHaveBeenCalledWith({
    id: 'demo',
    authors: ['alice', 'bob'],
    isPrivate: false,
  });
});

it('does not expose subscriptions or configuration to a read-only viewer', () => {
  render(
    <PackageTabs
      packageName="demo"
      detail={{ ...detail, canEditMetadata: false }}
      selectedVersion="1.0.0"
      urls={urls}
    />,
  );
  expect(screen.queryByRole('tab', { name: 'Configuración' })).toBeNull();
  expect(screen.queryByRole('tab', { name: 'Suscripciones' })).toBeNull();
});

it('shows certifications inside the single Versions tab, not a Certs tab', () => {
  render(
    <PackageTabs
      packageName="demo"
      detail={{
        ...detail,
        canEditMetadata: false,
        versions: [
          {
            version: '1.0.0',
            certifications: [
              {
                tier: 'TIER_1',
                status: 'approved',
                checks: [{ name: 'Check skills.yml', passed: true }],
              },
            ],
          },
        ],
      }}
      selectedVersion="1.0.0"
      urls={urls}
    />,
  );
  expect(screen.queryByRole('tab', { name: 'Certs' })).toBeNull();
  fireEvent.click(screen.getByRole('tab', { name: 'Versions' }));
  expect(screen.getByTestId('tier-1.0.0-TIER_1')).toBeTruthy();
  expect(screen.queryByTestId('certs-list')).toBeNull();
});
