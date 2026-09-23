# @quarks.studio/registry

React hooks for authenticated registry access:

- `useSearchPackages(query)`
- `useFetchPackage(name)`
- `usePackageReadme(name, version)`
- `usePackageCertifications(name, version?)`
- `useUpdatePackageMetadata()` for the description/tags/authors editor
- `useCurrentUser()`
- `useRegistryClient()` for event handlers and mutations

The readme and certification hooks power the web package-detail page
(`@quarks.studio/ui/web`) and are exercised by `tools/check-cli-artifacts.mjs` through
the built bundle.

Node workflows can use the lower-level `apiFetch` and `apiRequest` exports.

Archive publication without React or Ink uses `configureRegistry(api)` and
`uploadPackageArchive(input)` from `@quarks.studio/registry/upload`. The endpoint is
shared with `Client.API`. Upload accepts archive bytes, filename, package name,
version, description and an optional token (otherwise `MANAGER_SERVER_TOKEN`).

It also exposes `registerAuditorPasskey` and `signAuditDecision`, which run the
WebAuthn S4 ceremonies against the server endpoints without handling private
keys in JavaScript.

Authenticated clients also expose `Client.Gateway` for payment-provider
operations:

- `tokenizePaymentMethod(system, input)` stores only a provider token reference.
- `createSubscription(system, input, idempotencyKey)` creates a package subscription.
- `getSubscription(system, subscriptionId)` reads subscription status and benefits.
- `cancelSubscription(system, subscriptionId, idempotencyKey)` cancels a subscription.
- `execute(system, input, idempotencyKey)` performs a one-time payment.

The payment provider must tokenize card details on the client side. Card
numbers and security codes must never be sent to this client or persisted by
the manager.

## CLI

Screens and command adapters live in `src/CLI`, one React component per file.
Import them through `@quarks.studio/registry/CLI`; the main entrypoint keeps its
business API and does not load CLI presentation. Shared Ink components and
terminal helpers come from `@quarks.studio/ui/CLI`.

## Request-scoped client (0.2)

`import { createRegistryClient } from '@quarks.studio/registry/client'` provides a React-free client for Astro and other server runtimes. Construct it with `{ baseUrl, token?, fetch? }` per request. It shares package operations with the existing client but does not use global configuration, browser storage or a shared response cache. `RegistryHttpError.status` preserves HTTP errors; bundle downloads return the original streaming `Response`.

Existing client and hook entry points remain available for compatibility. Pure package/version types and helpers are also exported by the `client` entry.
