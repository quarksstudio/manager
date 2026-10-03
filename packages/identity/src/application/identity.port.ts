import type { AuthSession, CurrentUser } from '../domain/auth-session';

/** The registry's own identity routes, behind the shared transport. */
export interface IdentityGateway {
  /** The single token exchange every provider handshake goes through. */
  exchange(token: string, refreshToken?: string): Promise<AuthSession>;
  me(): Promise<CurrentUser>;
  logout(): Promise<unknown>;
}

/** Where an established session is kept between two processes. */
export interface SessionRepository {
  save(session: AuthSession, ttlMs?: number): Promise<void>;
  clear(): Promise<void>;
}

/**
 * Hands a URL to whatever the user calls a browser and returns the window
 * handle, so a strategy that has to close it or wait for it can.
 *
 * Returns `undefined` in Node.js, where the browser owns the window, and `null`
 * when a popup is blocked.
 */
export interface BrowserLauncher {
  open(
    url: string,
    target?: string,
    features?: string,
  ): Promise<Window | null | undefined>;
}

/** The last resort for a headless host with no browser left to redirect. */
export interface ManualCodeChannel {
  wait(): Promise<string>;
  submit(code: string): void;
}

/** Waits for the callback page to hand the session back through `postMessage`. */
export interface PopupCallback {
  /** Closes the popup once the page answers, and resolves with its payload. */
  await(options: {
    popup: Window;
    origin: string;
    state: string;
    timeoutMs: number;
  }): Promise<unknown>;
}

/**
 * A one-shot loopback listener. It cannot build the redirect itself, because the
 * URL depends on the port it ends up binding, so it asks the caller to turn a
 * continue URI into an authorization URL and to open it.
 */
export interface LoopbackCallback {
  capture(options: {
    port?: number;
    authorizationUrl: (continueUri: string) => string;
    open: (authorizationUrl: string) => Promise<void>;
  }): Promise<{ token: string; refreshToken?: string }>;
}

/** What a login strategy is allowed to know about where it is running. */
export interface LoginEnvironment {
  /** Where a deep-link callback lands, or `null` outside a browser. */
  origin(): string | null;
  /** A fresh anti-forgery value for the authorization request. */
  randomState(): string;
}
