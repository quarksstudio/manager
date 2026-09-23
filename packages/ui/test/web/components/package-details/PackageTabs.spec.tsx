import { render, screen } from '@testing-library/react';
import { PackageTabs } from '../../../../src/web/components/package-details/PackageTabs';
const detail = {
  id: 'demo',
  name: 'demo',
  description: 'Demo',
  authors: ['alice'],
  tags: [],
  downloads: 0,
  canEditMetadata: true,
  versions: [{ version: '1.0.0' }],
};
it('shows a server-action form with preserved draft and error', () => {
  render(
    <PackageTabs
      packageName="demo"
      detail={detail}
      selectedVersion="1.0.0"
      readme={{ content: '', loading: false, version: '1.0.0' }}
      urls={{ versions: {}, downloads: {}, metadata: '/packages/demo/1.0.0' }}
      formError="Forbidden"
      draft={{ description: 'Unsaved', authors: 'alice', tags: 'new' }}
    />,
  );
  expect(screen.getByRole('alert').textContent).toBe('Forbidden');
  expect(
    (screen.getByLabelText('Description') as HTMLTextAreaElement).value,
  ).toBe('Unsaved');
  expect(
    screen
      .getByRole('button', { name: 'Save changes' })
      .closest('form')
      ?.getAttribute('action'),
  ).toBe('/packages/demo/1.0.0');
});
it('does not expose editing to a read-only viewer', () => {
  render(
    <PackageTabs
      packageName="demo"
      detail={{ ...detail, canEditMetadata: false }}
      selectedVersion="1.0.0"
      readme={{ content: '', loading: false, version: '1.0.0' }}
      urls={{ versions: {}, downloads: {} }}
    />,
  );
  expect(screen.queryByText('Save changes')).toBeNull();
});
