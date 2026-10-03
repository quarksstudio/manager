/**
 * Wire protocol between the authentication popup (`/auth/callback`) and the
 * window that opened it.
 *
 * Kept dependency-free on purpose: the popup renders it into the browser while
 * `@quarks.studio/identity` is the React-free entry the app imports, so
 * re-exporting from there costs no bundle weight.
 */
export const AUTH_MESSAGE = 'AUTH_SUCCESS';
