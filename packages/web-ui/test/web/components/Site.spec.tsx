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

it('submits a new search to the homepage with the query input prefilled', () => {
  render(
    <SiteNavbar logo="Quark" searchPlaceholder="Search" searchValue="Demo" />,
  );
  const form = screen.getByRole('search');
  expect(form.getAttribute('action')).toBe('/');
  expect(form.getAttribute('method')).toBe('get');
  const input = screen.getByRole('searchbox') as HTMLInputElement;
  expect(input.name).toBe('query');
  expect(input.value).toBe('Demo');
  expect(
    screen.getByRole('button', { name: 'Search' }).getAttribute('type'),
  ).toBe('submit');
});
