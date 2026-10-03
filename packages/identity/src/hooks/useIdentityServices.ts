import { useMemo } from 'react';
import { createIdentityServices } from '../presentation/configured-services';
export function useIdentityServices() {
  return useMemo(createIdentityServices, []);
}
