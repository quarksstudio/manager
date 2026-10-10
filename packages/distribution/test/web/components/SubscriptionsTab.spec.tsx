import { fireEvent, render, screen } from '@testing-library/react';
import { SubscriptionsTab } from '../../../../src/web';

jest.mock('@quarks.studio/commerce/web', () => ({
  ...jest.requireActual('@quarks.studio/commerce/web'),
  ConfiguredMonthlyTotals: () => <div data-testid="plans" />,
}));

const detail = {
  id: 'demo',
  name: 'demo',
  description: 'Demo',
  authors: ['alice'],
  tags: [],
  downloads: 0,
  canEditMetadata: true,
  versions: [{ version: '1.0.0' }, { version: '1.1.0' }],
};

it('renders the run selector and the subscriptions panel', () => {
  render(<SubscriptionsTab detail={detail} selectedVersion="1.0.0" />);
  expect(screen.getByTestId('subscriptions-tab')).toBeTruthy();
  expect(screen.getByLabelText('Versión')).toBeTruthy();
  expect(screen.getByLabelText('Test Tier')).toBeTruthy();
  expect(screen.getByTestId('plans')).toBeTruthy();
});

it('keeps Run disabled until a tier is chosen', () => {
  render(<SubscriptionsTab detail={detail} selectedVersion="1.0.0" />);
  const run = screen.getByTestId('run-certification') as HTMLButtonElement;
  expect(run.disabled).toBe(true);

  fireEvent.mouseDown(screen.getByLabelText('Test Tier'));
  fireEvent.click(screen.getByTitle('Tier 1 - Basic Certification'));

  expect(run.disabled).toBe(false);
});
