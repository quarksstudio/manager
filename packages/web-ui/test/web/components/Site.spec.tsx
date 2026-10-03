import { render, screen } from '@testing-library/react';
import { SiteNavbar, SiteFooter } from '../../../src';

it('renders the host search route, logo and supplied identity slot', () => {
  render(
    <SiteNavbar
      logo="My site"
      searchAction="/search"
      searchPlaceholder="Search"
    >
      <button>Account</button>
    </SiteNavbar>,
  );
  expect(screen.getByRole('search').getAttribute('action')).toBe('/search');
  expect(screen.getByText('My site').getAttribute('href')).toBe('/');
  expect(screen.getByRole('button', { name: 'Account' })).toBeTruthy();
});
it('renders footer links supplied by the host', () => {
  render(<SiteFooter links={[{ label: 'Docs', href: 'https://docs.test' }]} />);
  expect(screen.getByRole('link', { name: 'Docs' }).getAttribute('href')).toBe(
    'https://docs.test',
  );
});
