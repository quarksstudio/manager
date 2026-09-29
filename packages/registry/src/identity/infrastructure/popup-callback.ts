import { AUTH_MESSAGE } from '../domain/auth-callback-protocol';
import type { PopupCallback } from '../application/identity.port';

/**
 * The callback page posts the session back through `window.opener`; this is the
 * other half of that handshake.
 */
export function createPopupCallback(): PopupCallback {
  return {
    await: ({ popup, origin, state, timeoutMs }) =>
      new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          cleanup();
          reject(new Error('Authentication timed out after 3 minutes'));
        }, timeoutMs);
        const listener = (event: MessageEvent) => {
          if (event.origin !== origin) return;
          const detail = event.data as Record<string, unknown> | null;
          if (detail?.['type'] !== AUTH_MESSAGE || detail['state'] !== state) {
            return;
          }
          cleanup();
          popup.close();
          resolve(detail);
        };
        const cleanup = () => {
          clearTimeout(timeout);
          window.removeEventListener('message', listener);
        };
        window.addEventListener('message', listener);
      }),
  };
}
