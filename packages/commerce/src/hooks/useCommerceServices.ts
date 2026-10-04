import { useMemo } from 'react';
import { createBrowserCommerceServices } from '../infrastructure/browser-services';
export function useCommerceServices(apiBaseUrl?: string) {
  return useMemo(() => createBrowserCommerceServices(apiBaseUrl), [apiBaseUrl]);
}
