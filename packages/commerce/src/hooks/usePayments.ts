import type { PaymentRecord } from '../domain/payment-history';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type CommerceServices,
  type UsePaymentsReturn,
} from '../presentation/services';
import { useServices } from './useServices';
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
