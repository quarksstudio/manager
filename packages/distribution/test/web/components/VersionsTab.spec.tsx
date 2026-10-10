import { fireEvent, render, screen } from '@testing-library/react';
import { VersionsTab } from '../../../src/web';

const versions = [
  {
    version: '1.0.0',
    certifications: [
      {
        tier: 'TIER_4',
        status: 'approved',
        logUrl: '/logs/t4',
        checks: [
          { name: 'Check skills.yml', passed: true },
          { name: 'Check all the files', passed: false },
        ],
      },
      {
        tier: 'TIER_2',
        status: 'rejected',
        logUrl: '/logs/t2',
        checks: [{ name: 'Check skills.yml', passed: false }],
      },
      { tier: 'TIER_3', status: 'pending' },
    ],
  },
  { version: '0.9.0' },
];

const urls = {
  versions: {
    '1.0.0': '/packages/demo/1.0.0',
    '0.9.0': '/packages/demo/0.9.0',
  },
  downloads: {
    '1.0.0': '/packages/demo/1.0.0/download',
    '0.9.0': '/packages/demo/0.9.0/download',
  },
};

function renderVersions() {
  return render(
    <VersionsTab
      packageName="demo"
      versions={versions}
      selectedVersion="1.0.0"
      versionUrls={urls.versions}
      downloadUrls={urls.downloads}
    />,
  );
}

it('shows only approved or rejected tiers, hiding pending ones', () => {
  renderVersions();
  expect(screen.getByTestId('tier-1.0.0-TIER_4')).toBeTruthy();
  expect(screen.getByTestId('tier-1.0.0-TIER_2')).toBeTruthy();
  expect(screen.queryByTestId('tier-1.0.0-TIER_3')).toBeNull();
});

it('marks a failed tier in gray', () => {
  const { container } = renderVersions();
  const tier = container.querySelector('[data-testid="tier-1.0.0-TIER_2"]');
  expect(tier?.textContent).toBe('TIER_2');
  expect(tier?.className).toContain('text-slate-400');
});

it('renders an Uncertified tag for versions without visible certifications', () => {
  renderVersions();
  const row = screen.getByTestId('tiers-0.9.0');
  expect(row.textContent).toContain('Uncertified');
});

it('expands the selected tier showing its checks, logs link and marker', () => {
  const { container } = renderVersions();
  expect(screen.queryByTestId('checks-1.0.0-TIER_4')).toBeNull();

  fireEvent.click(screen.getByTestId('tier-1.0.0-TIER_4'));

  expect(screen.getByTestId('checks-1.0.0-TIER_4')).toBeTruthy();
  expect(screen.getByText('[PASS]')).toBeTruthy();
  expect(screen.getByText('[FAIL]')).toBeTruthy();
  expect(screen.getByText('Check skills.yml')).toBeTruthy();
  expect(screen.getByText('Check all the files')).toBeTruthy();

  const logs = screen.getByTestId('logs-1.0.0-TIER_4');
  expect(logs.getAttribute('href')).toBe('/logs/t4');

  const active = screen.getByTestId('tier-1.0.0-TIER_4');
  expect(active.textContent).toBe('TIER_4 *');
  expect(active.getAttribute('aria-pressed')).toBe('true');

  const pass = container.querySelector(
    '[data-testid="check-1.0.0-TIER_4-0"] span',
  );
  expect(pass?.textContent).toBe('[PASS]');
  expect(pass?.className).toContain('text-amber-600');
  const fail = container.querySelector(
    '[data-testid="check-1.0.0-TIER_4-1"] span',
  );
  expect(fail?.textContent).toBe('[FAIL]');
  expect(fail?.className).toContain('text-slate-400');
});

it('switches the expanded tier and collapses on a second click', () => {
  renderVersions();
  fireEvent.click(screen.getByTestId('tier-1.0.0-TIER_4'));
  fireEvent.click(screen.getByTestId('tier-1.0.0-TIER_2'));

  expect(screen.queryByTestId('checks-1.0.0-TIER_4')).toBeNull();
  expect(screen.getByTestId('checks-1.0.0-TIER_2')).toBeTruthy();
  expect(screen.getByTestId('logs-1.0.0-TIER_2').getAttribute('href')).toBe(
    '/logs/t2',
  );

  fireEvent.click(screen.getByTestId('tier-1.0.0-TIER_2'));
  expect(screen.queryByTestId('checks-1.0.0-TIER_2')).toBeNull();
  expect(screen.queryByTestId('logs-1.0.0-TIER_2')).toBeNull();
});

it('keeps working download and version links per row', () => {
  renderVersions();
  const download = screen.getByRole('link', {
    name: 'Download version 1.0.0',
  });
  expect(download.getAttribute('href')).toBe('/packages/demo/1.0.0/download');
  const select = screen.getByTestId('select-1.0.0');
  expect(select.getAttribute('href')).toBe('/packages/demo/1.0.0');
});
