/** @jest-environment jsdom */
import { act, renderHook, waitFor } from '@testing-library/react';
import { usePaymentLink } from '../../src/hooks';
import { createHttpBillingGateway } from '../../src/http';
import { createHttpContext } from '@quarks.studio/registry/http';
const REGISTRY = 'https://registry.test/v1';
const navigate = jest.fn();
const plan = {
  kind: 'plan',
  packageId: 'demo',
  productId: 'PL1',
  system: 'paypal',
} as const;
let fetchMock: jest.Mock;
const originalFetch = globalThis.fetch;
afterAll(() => {
  globalThis.fetch = originalFetch;
});
beforeEach(() => {
  navigate.mockReset();
  fetchMock = jest.fn();
  globalThis.fetch = fetchMock;
});
const answer = (body: unknown, status = 200) =>
  fetchMock.mockResolvedValue({
    status,
    ok: status >= 200 && status < 300,
    statusText: status === 200 ? 'OK' : 'Error',
    json: async () => body,
  });
const services = {
  createPaymentLink: (
    system: string,
    target: Parameters<
      ReturnType<typeof createHttpBillingGateway>['createPaymentLink']
    >[1],
    baseUrl?: string,
  ) =>
    createHttpBillingGateway(
      createHttpContext({ baseUrl: baseUrl ?? REGISTRY }),
    ).createPaymentLink(system, target),
  listPayments: jest.fn(),
};
beforeEach(() => jest.clearAllMocks());
it('asks the gateway for the hosted page and forwards the payer there', async () => {
  answer({
    system: 'paypal',
    url: 'https://paypal.test/checkout',
    reference: 'ref-1',
  });
  const { result } = renderHook(() =>
    usePaymentLink({ apiBaseUrl: REGISTRY, navigate }, services),
  );

  await act(async () => {
    await result.current.pay(plan);
  });

  expect(fetchMock).toHaveBeenCalledWith(
    `${REGISTRY}/gateway/paypal/PL1/demo`,
    expect.objectContaining({ method: 'GET' }),
  );
  expect(navigate).toHaveBeenCalledWith('https://paypal.test/checkout');
  expect(result.current).toMatchObject({ failure: null, isPaying: false });
});
it('names the failure instead of writing the payer a sentence', async () => {
  answer({}, 401);
  const { result } = renderHook(() =>
    usePaymentLink({ apiBaseUrl: REGISTRY, navigate }, services),
  );

  await act(async () => {
    await result.current.pay(plan);
  });

  expect(navigate).not.toHaveBeenCalled();
  expect(result.current.failure).toBe('unauthenticated');
});
