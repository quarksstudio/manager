import type {
  PaymentRecord,
  PaymentPage,
  PaymentListOptions,
} from './domain/payment-history';
import {
  createContext,
  createElement,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { RegistryHttpError } from '@quarks.studio/types/http';
import {
  paymentLinkFailure,
  type PaymentLinkFailure,
} from './domain/payment-link-failure';
import type {
  PaymentLinkRequest,
  PaymentLinkTarget,
} from './domain/payment-link-path';
export interface CommerceServices {
  createPaymentLink(
    system: string,
    target: PaymentLinkTarget,
    baseUrl?: string,
  ): Promise<{ url: string }>;
  listPayments(options?: PaymentListOptions): Promise<PaymentPage>;
}

const ServicesContext = createContext<CommerceServices | null>(null);
export function CommerceProvider({
  services,
  children,
}: {
  services: CommerceServices;
  children: ReactNode;
}) {
  return createElement(ServicesContext.Provider, { value: services }, children);
}
function useServices(override?: CommerceServices): CommerceServices {
  const services = useContext(ServicesContext);
  if (override) return override;
  if (!services) throw new Error('CommerceProvider is required');
  return services;
}
export interface UsePaymentLinkOptions {
  /**
   * Defaults to the ambient client, which reads the configured registry. A host
   * that already resolved its own endpoint passes it here instead of leaving
   * the payment call to guess.
   */
  apiBaseUrl?: string;
  /** Overridable so a test can watch the redirect without a real navigation. */
  navigate?: (url: string) => void;
}

export interface UsePaymentLinkReturn {
  pay: (request: PaymentLinkRequest) => Promise<void>;
  isPaying: boolean;
  /** The named case, not a sentence: the surface owns the wording. */
  failure: PaymentLinkFailure | null;
  reset: () => void;
}

/**
 * Builds the payment link and sends the payer to the gateway's hosted page.
 *
 * There is no checkout route and no form: a click is the whole request, the
 * server answers the hosted URL and this hook navigates. Nothing about the
 * amount is decided on this side, and `returnUrl`/`cancelUrl` are deliberately
 * absent — the server hands them to the gateway, so accepting them from a
 * caller would let anyone bounce a payer anywhere.
 */
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

function redirectTo(url: string): void {
  if (typeof window === 'undefined')
    throw new Error('A payment redirect needs a browser.');
  window.location.assign(url);
}

export interface UsePaymentsReturn {
  data: PaymentRecord[];
  loading: boolean;
  error: unknown;
  hasMore: boolean;
  refetch: () => void;
  loadMore: () => Promise<void>;
}
export function usePayments(
  options: { limit?: number } = {},
  override?: CommerceServices,
): UsePaymentsReturn {
  const services = useServices(override);
  const [data, setData] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const generation = useRef(0);
  const busy = useRef(false);
  const limit = options.limit;
  useEffect(() => {
    const request = ++generation.current;
    busy.current = true;
    setData([]);
    setCursor(null);
    setLoading(true);
    setError(null);
    void services
      .listPayments({ limit })
      .then((page) => {
        if (generation.current !== request) return;
        setData(page.items);
        setCursor(page.nextCursor);
      })
      .catch((reason: unknown) => {
        if (generation.current === request) setError(reason);
      })
      .finally(() => {
        if (generation.current === request) {
          busy.current = false;
          setLoading(false);
        }
      });
    return () => {
      generation.current++;
    };
  }, [services, limit, revision]);
  const refetch = useCallback(() => {
    generation.current++;
    setRevision((value) => value + 1);
  }, []);
  const loadMore = useCallback(async () => {
    if (!cursor || busy.current) return;
    const request = generation.current;
    busy.current = true;
    setLoading(true);
    setError(null);
    try {
      const page = await services.listPayments({ limit, cursor });
      if (generation.current !== request) return;
      setData((current) => [
        ...new Map(
          [...current, ...page.items].map((item) => [item.id, item]),
        ).values(),
      ]);
      setCursor(page.nextCursor);
    } catch (reason) {
      if (generation.current === request) setError(reason);
    } finally {
      if (generation.current === request) {
        busy.current = false;
        setLoading(false);
      }
    }
  }, [services, limit, cursor]);
  return { data, loading, error, hasMore: cursor !== null, refetch, loadMore };
}
