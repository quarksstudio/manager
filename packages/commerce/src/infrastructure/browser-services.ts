import { createGlobalContext } from '@quarks.studio/config/http';
import type { CommerceServices } from '../presentation/services';
import { createHttpBillingGateway } from '../http';

/** Read the browser session for each request so login/logout takes effect immediately. */
export function createBrowserCommerceServices(
  apiBaseUrl?: string,
): CommerceServices {
  const gateway = () =>
    createGlobalContext({ baseUrl: apiBaseUrl }).then(createHttpBillingGateway);

  return {
    createPaymentLink: async (system, target) => {
      return (await gateway()).createPaymentLink(system, target);
    },
    listPayments: async (options) => {
      return (await gateway()).listPayments(options);
    },
  };
}
