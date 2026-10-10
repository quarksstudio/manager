import { useMemo } from 'react';
import { createConfiguredContext } from '@quarks.studio/config/http';
export function useLandingServices(apiBaseUrl: string) {
  return useMemo(() => {
    const context = createConfiguredContext(apiBaseUrl);
    return {
      search: () =>
        context.fetchJson<{ items: Array<{ id: string }> }>('package?query='),
    };
  }, [apiBaseUrl]);
}
