import { createConfiguredContext } from '@quarks.studio/config/http';
import {
  createHttpIdentityGateway,
  createConfigSessionRepository,
} from '../http';
import { loginWithProvider, submitManualLoginCode } from '../configured';
import type { IdentityServices } from './services';
export function createIdentityServices(): IdentityServices {
  const gateway = createHttpIdentityGateway(createConfiguredContext());
  return {
    loginWithProvider,
    submitManualLoginCode,
    me: () => gateway.me(),
    logout: () => gateway.logout(),
    clearSession: () => createConfigSessionRepository().clear(),
  };
}
