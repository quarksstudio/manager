import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  DistributionProvider,
  type DistributionServices,
} from '../../../../src/presentation';
import { PackageTabs } from '../../../../src/web';

jest.mock('@quarks.studio/commerce/web', () => ({
  ...jest.requireActual('@quarks.studio/commerce/web'),
  ConfiguredMonthlyTotals: () => <div data-testid="plans" />,
}));

const detail = {
  id: 'demo',
  name: 'demo',
  description: 'Demo',
  authors: ['alice'],
  tags: ['demo'],
  downloads: 0,
  canEditMetadata: true,
  versions: [{ version: '1.0.0' }],
};

const readme = { content: '', loading: false, version: '1.0.0' };
const urls = { versions: {}, downloads: {} };

function servicesWith(update = jest.fn().mockResolvedValue({})) {
  const services: DistributionServices = {
    downloadBundle: jest.fn(),
    getCurrentUser: jest.fn().mockResolvedValue({ id: 'alice' }),
    get: jest.fn(),
    getReadme: jest.fn(),
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
        readme={readme}
        urls={urls}
      />
    </DistributionProvider>,
  );
  expect(screen.getByRole('tab', { name: 'Configuración' })).toBeTruthy();
  // The server props are on screen before the editor seeds itself.
  expect(screen.getByLabelText('Descripción')).toHaveProperty(
    'value',
    'Demo',
  );
  expect(screen.getByTestId('member-alice')).toBeTruthy();
  expect(screen.getByTestId('tag-demo')).toBeTruthy();
  // The panel is a browser island: it never posts to the package route.
  expect(screen.getByTestId('plans')).toBeTruthy();

  await act(async () => {
    await Promise.resolve();
  });
  const input = screen.getByLabelText('Nuevo miembro');
  fireEvent.change(input, { target: { value: 'bob' } });
  fireEvent.click(screen.getByRole('button', { name: 'Añadir miembro' }));
  expect(await screen.findByTestId('member-bob')).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
  expect(update).toHaveBeenCalledWith({
    id: 'demo',
    description: 'Demo',
    tags: ['demo'],
    authors: ['alice', 'bob'],
  });
});

it('does not expose configuration to a read-only viewer', () => {
  render(
    <PackageTabs
      packageName="demo"
      detail={{ ...detail, canEditMetadata: false }}
      selectedVersion="1.0.0"
      readme={readme}
      urls={urls}
    />,
  );
  expect(screen.queryByRole('tab', { name: 'Configuración' })).toBeNull();
});
