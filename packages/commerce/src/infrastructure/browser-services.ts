import { loadConfig } from '@quarks.studio/config';
import type { CommerceServices } from '../presentation/services';
import { createHttpContext } from '@quarks.studio/registry/http';
import { createHttpBillingGateway } from '../http';

/** Read the browser session for each request so login/logout takes effect immediately. */
export function createBrowserCommerceServices(
  apiBaseUrl: string,
): CommerceServices {
  return {
    createPaymentLink: async (system, target, baseUrl) => {
      const { config } = await loadConfig();
      return createHttpBillingGateway(
        createHttpContext({
          baseUrl: baseUrl ?? apiBaseUrl,
          token: config.token,
        }),
      ).createPaymentLink(system, target);
    },
    listPayments: async (options) => {
      const { config } = await loadConfig();
      return createHttpBillingGateway(
        createHttpContext({
          baseUrl: apiBaseUrl,
          token: config.token,
        }),
      ).listPayments(options);
    },
  };
}
