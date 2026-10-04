import { useMemo } from 'react';
import { userProfileServices } from '../infrastructure/user-profile-services';

export function useUserProfileServices(apiBaseUrl?: string) {
  return useMemo(() => userProfileServices(apiBaseUrl), [apiBaseUrl]);
}
