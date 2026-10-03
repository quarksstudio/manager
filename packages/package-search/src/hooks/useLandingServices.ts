import { useMemo } from 'react';
import { createHttpContext } from '@quarks.studio/registry/http';
export function useLandingServices(apiBaseUrl: string) {
  return useMemo(() => {
    const context = createHttpContext({ baseUrl: apiBaseUrl });
    return {
      search: () =>
        context.fetchJson<{ items: Array<{ id: string }> }>('package?query='),
    };
  }, [apiBaseUrl]);
}
