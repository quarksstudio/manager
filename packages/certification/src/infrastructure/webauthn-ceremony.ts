import {
  startAuthentication,
  startRegistration,
} from '@simplewebauthn/browser';
import type { WebAuthnDriver } from '../application/audit-decision';
export function createWebAuthnDriver(): WebAuthnDriver {
  return {
    register: (optionsJSON) => startRegistration({ optionsJSON }),
    authenticate: (optionsJSON) => startAuthentication({ optionsJSON }),
  };
}
