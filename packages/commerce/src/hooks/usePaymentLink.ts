import { useCallback, useState } from 'react';
import { RegistryHttpError } from '@quarks.studio/registry/http';
import {
  paymentLinkFailure,
  type PaymentLinkFailure,
} from '../domain/payment-link-failure';
import type { PaymentLinkRequest } from '../domain/payment-link-path';
import {
  type CommerceServices,
  type UsePaymentLinkOptions,
  type UsePaymentLinkReturn,
  redirectTo,
} from '../presentation/services';
import { useServices } from './useServices';
export function usePaymentLink(
  options: UsePaymentLinkOptions = {},
  override?: CommerceServices,
): UsePaymentLinkReturn {
  const { apiBaseUrl, navigate } = options;
  const client = useServices(override);
  const [isPaying, setIsPaying] = useState(false);
  const [failure, setFailure] = useState<PaymentLinkFailure | null>(null);

  const pay = useCallback(
    async (request: PaymentLinkRequest) => {
      const { system, ...target } = request;
      setIsPaying(true);
      setFailure(null);
      try {
        const link = await client.createPaymentLink(system, target, apiBaseUrl);
        (navigate ?? redirectTo)(link.url);
      } catch (reason) {
        setFailure(
          paymentLinkFailure(
            reason instanceof RegistryHttpError ? reason.status : undefined,
          ),
        );
      } finally {
        setIsPaying(false);
      }
    },
    [apiBaseUrl, client, navigate],
  );

  const reset = useCallback(() => {
    setFailure(null);
    setIsPaying(false);
  }, []);

  return { pay, isPaying, failure, reset };
}
