import { createGlobalContext } from '@quarks.studio/config/http';
import type { CommerceServices } from '../presentation/services';
import { createHttpBillingGateway } from '../http';

/** Read the browser session for each request so login/logout takes effect immediately. */
export function createBrowserCommerceServices(
  apiBaseUrl?: string,
): CommerceServices {
  const register = createGlobalContext({
    baseUrl: apiBaseUrl,
  }).then(createHttpBillingGateway);

  return {
    createPaymentLink: async (system, target) => {
      return (await register).createPaymentLink(system, target);
    },
    listPayments: async (options) => {
      return (await register).listPayments(options);
    },
  };
}
