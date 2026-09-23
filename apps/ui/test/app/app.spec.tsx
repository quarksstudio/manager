import { render, screen } from '@testing-library/react';
import App from '../../src/app/app';
jest.mock('@quarks.studio/ui/web', () => ({
  PackageDetails: ({
    packageName,
    selectedVersion,
  }: {
    packageName: string;
    selectedVersion: string;
  }) => (
    <div>
      {packageName} {selectedVersion}
    </div>
  ),
}));
it('uses the public screen URL with scoped names', () => {
  window.history.replaceState(null, '', '/packages/%40scope%2Fdemo/2.0.0');
  render(<App />);
  expect(screen.getByText('@scope/demo 2.0.0')).toBeTruthy();
});
