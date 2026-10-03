import type { ManualCodeChannel } from '../application/identity.port';

export const MANUAL_CODE_TIMEOUT_MS = 180_000;

let pending:
  | { resolve: (code: string) => void; reject: (error: Error) => void }
  | undefined;

/**
 * A headless host with no browser to redirect needs the token typed back in.
 * One login at a time: a second wait would leave the first caller hanging.
 */
export function createManualCodeChannel(
  timeoutMs = MANUAL_CODE_TIMEOUT_MS,
): ManualCodeChannel {
  return {
    wait() {
      if (pending) {
        throw new Error('Another manual login is already pending');
      }
      return new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => {
          pending = undefined;
          reject(new Error('Authentication timed out after 3 minutes'));
        }, timeoutMs);
        pending = {
          resolve: (code) => {
            clearTimeout(timeout);
            resolve(code);
          },
          reject,
        };
      });
    },

    submit(code: string) {
      const normalized = code.trim();
      if (!pending) {
        throw new Error('No manual login is waiting for a code');
      }
      if (!normalized) {
        throw new Error('Authentication code must not be empty');
      }
      const waiting = pending;
      pending = undefined;
      waiting.resolve(normalized);
    },
  };
}
