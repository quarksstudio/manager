import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';

import App from './app';

jest.mock('@quark/ui/web', () => ({
  PackageDetails: function MockPackageDetails({
    packageName,
    initialVersion,
    onVersionChange,
  }: {
    packageName: string;
    initialVersion?: string;
    onVersionChange?: (version: string) => void;
  }) {
    return (
      <div data-testid="package-details">
        PackageDetails: {packageName}
        {initialVersion ? ` : ${initialVersion}` : ''}
        {onVersionChange ? (
          <button
            data-testid="change-version"
            onClick={() => onVersionChange('2.0.0')}
          >
            change
          </button>
        ) : null}
      </div>
    );
  },
  usePackageDetailsView: (name: string) => ({
    packageName: name,
    loading: false,
    latestVersion: '2.0.0',
  }),
}));

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}</span>;
}

describe('App', () => {
  it('should render successfully', () => {
    const { baseElement } = render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );
    expect(baseElement).toBeTruthy();
  });

  it('redirects an unscoped package to its latest version', () => {
    render(
      <MemoryRouter initialEntries={['/packages/react']}>
        <App />
        <LocationProbe />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('package-details').textContent).toContain(
      'PackageDetails: react : 2.0.0',
    );
    expect(screen.getByTestId('location').textContent).toBe(
      '/packages/react/2.0.0',
    );
  });

  it('shows the requested version on a versioned route', () => {
    render(
      <MemoryRouter initialEntries={['/packages/react/1.0.0']}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('package-details').textContent).toContain(
      'PackageDetails: react : 1.0.0',
    );
  });

  it('decodes scoped package names and versions in the route', () => {
    render(
      <MemoryRouter initialEntries={['/packages/%40scope%2Ftool/1.0.0-rc.1']}>
        <App />
        <LocationProbe />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('package-details').textContent).toContain(
      'PackageDetails: @scope/tool : 1.0.0-rc.1',
    );
    expect(screen.getByTestId('location').textContent).toBe(
      '/packages/%40scope%2Ftool/1.0.0-rc.1',
    );
  });

  it('navigates when the onVersionChange button is clicked', () => {
    render(
      <MemoryRouter initialEntries={['/packages/react/1.0.0']}>
        <App />
        <LocationProbe />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByTestId('change-version'));
    expect(screen.getByTestId('location').textContent).toBe(
      '/packages/react/2.0.0',
    );
  });

  it('renders the placeholder on the home route', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
        <LocationProbe />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('location').textContent).toBe('/');
    expect(screen.getByText(/Select a package/)).toBeTruthy();
  });
});
