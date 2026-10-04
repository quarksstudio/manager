/**
 * The registry endpoint the browser talks to, injected at build time from
 * `QUARK_REGISTRY_URL` (see `astro.config.mjs`). It is a plain value on purpose:
 * the pages hand it to the pricing components, which pass it to
 * `usePaymentLink` instead of leaving the payment call to the ambient
 * configuration the browser cannot see the environment of.
 */
export const registryBaseUrl =
  (import.meta.env.QUARK_API as string | undefined) ??
  'https://api.quarks.studio/v1';
