/** @jest-environment node */
import { loadConfig } from '@quarks.studio/config';
import { RegistryHttpError } from '@quarks.studio/registry/http';
import { createBrowserCommerceServices } from '../../src/infrastructure/browser-services';

jest.mock('@quarks.studio/config', () => ({
  loadConfig: jest.fn(),
  clearSession: jest.fn().mockResolvedValue(undefined),
}));
const originalFetch = globalThis.fetch;
const mockFetch = jest.fn();
const mockConfig = jest.mocked(loadConfig);
beforeEach(() => {
  mockFetch.mockReset();
  globalThis.fetch = mockFetch;
  mockConfig.mockResolvedValue({
    config: { token: 'alice', registryUrl: 'https://other.test/v1' },
  } as Awaited<ReturnType<typeof loadConfig>>);
});
afterAll(() => {
  globalThis.fetch = originalFetch;
});

it('calls the API directly with the current bearer, query and no-store', async () => {
  const page = { items: [], nextCursor: 'next' };
  mockFetch.mockResolvedValue(
    new Response(JSON.stringify(page), { status: 200 }),
  );
  const services = createBrowserCommerceServices('https://api.test/v1');
  expect(
    await services.listPayments({ limit: 25, cursor: 'page-two' }),
  ).toEqual(page);
  const [url, request] = mockFetch.mock.calls[0];
  expect(url).toBe('https://api.test/v1/payments/me?limit=25&cursor=page-two');
  expect(request.headers.get('Authorization')).toBe('Bearer alice');
  expect(request.cache).toBe('no-store');
});

it('reads a changed session for pagination and sends no bearer after logout', async () => {
  mockFetch.mockImplementation(
    async () => new Response(JSON.stringify({ items: [], nextCursor: null })),
  );
  const services = createBrowserCommerceServices('https://api.test/v1');
  await services.listPayments();
  mockConfig.mockResolvedValue({ config: { token: 'bob' } } as Awaited<
    ReturnType<typeof loadConfig>
  >);
  await services.listPayments({ cursor: 'bob-page' });
  expect(mockFetch.mock.calls[1][1].headers.get('Authorization')).toBe(
    'Bearer bob',
  );
  mockConfig.mockResolvedValue({ config: {} } as Awaited<
    ReturnType<typeof loadConfig>
  >);
  await services.listPayments();
  expect(mockFetch.mock.calls[2][1].headers.get('Authorization')).toBeNull();
});

it.each([400, 401])(
  'preserves the API status %s for the view to handle',
  async (status) => {
    mockFetch.mockResolvedValue(new Response('{}', { status }));
    await expect(
      createBrowserCommerceServices('https://api.test/v1').listPayments(),
    ).rejects.toMatchObject({ status });
    await expect(
      createBrowserCommerceServices('https://api.test/v1').listPayments(),
    ).rejects.toBeInstanceOf(RegistryHttpError);
  },
);

it('resolves an omitted endpoint from configuration on the first payment request', async () => {
  mockFetch.mockResolvedValue(
    new Response(JSON.stringify({ items: [], nextCursor: null })),
  );
  await createBrowserCommerceServices().listPayments();
  expect(mockFetch.mock.calls[0][0]).toBe('https://other.test/v1/payments/me');
});
