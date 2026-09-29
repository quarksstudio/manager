import {
  startAuthentication,
  startRegistration,
} from '@simplewebauthn/browser';

import type { WebAuthnDriver } from '../application/audit-decision';

/** Delegates to the platform authenticator; no key material is handled here. */
export function createWebAuthnDriver(): WebAuthnDriver {
  return {
    register: (optionsJSON) => startRegistration({ optionsJSON }),
    authenticate: (optionsJSON) => startAuthentication({ optionsJSON }),
  };
}
