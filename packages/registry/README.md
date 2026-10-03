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

## Authentication

`loginWithProvider({ provider })` drives the whole browser handshake
(`deep-link`, `local-server` and `manual-code`), but it never talks to the
identity provider itself. The client only builds one URL and opens it:

```
<registryUrl>/auth/login/<provider>/<continueUri>
```

because `registryUrl` already carries the `/v1` prefix, the effective route is
`GET /v1/auth/login/:provider/:callback`. The server is expected to:

1. map `:provider` to its identity identifier (`google` → `google.com`), reusing
   the `Provider` enum from `@quarks.studio/types/client`;
2. call `POST <authBase>/accounts:createAuthUri?key=<authKey>` with
   `{ providerId, continueUri }` where `continueUri` is `:callback` decoded and
   must be an absolute `http(s)` URL;
3. answer `302` with `Location: <authUri>` and `Cache-Control: no-store`
   (`400` for an unknown provider or callback, `502` when the identity provider
   fails).

The server credential never reaches this package, so `authKey` and `authBase`
are not part of `@quarks.studio/config`. The provider token still comes back
through the callback and is exchanged with `POST /v1/auth/exchange`.

Archive publication without React or Ink uses `uploadPackageArchive(input)` from
`@quarks.studio/registry/upload`. The endpoint comes from the configuration:
`QUARK_REGISTRY_URL` in the environment, or `quark config set registryUrl`. The
same value backs `Client.API`. Upload accepts archive bytes, filename, package
name, version, description and an optional token (otherwise the configured
`QUARK_TOKEN` or the stored session).

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

## Functional packages

Registry owns HTTP, cache and composition. Business implementations live in:

- `identity`: authentication and sessions.
- `package-search`: local/remote search and filters.
- `commerce`: commercial catalog, subscriptions, payment links and payment history.
- `distribution`: package metadata, versions, README and streaming downloads.
- `certification`: certification rules and WebAuthn ceremonies (WebAuthn driver).
- `publisher`: validation, packaging and archive upload through `publisher/upload`.

The existing root, `/client`, `/headless`, `/upload` and `/CLI` contracts remain
available. Domain consumers should import their owning functional package.
Each functionality exports headless models and ports at its root, adapters at
`/http`, and React hooks/providers at `/react` where applicable. Adapters receive
the transport through ports from `@quarks.studio/types/http`; functionalities
never import registry.

`RegistryProvider` from `@quarks.studio/registry/react` wires functional React
providers to the configured client. Hosts may instead supply services directly
to individual providers. Existing registry hooks remain available without a
provider and delegate to the same functional hooks.

CLI screens live in their functional package and share hooks with Web/UI.
Registry's compatible commands compose these screens with configured services. Terminal components
come from `terminal-ui`; `ui/CLI` remains a compatible entry.

`client.Gateway.listPayments({ limit?, cursor? })` calls `GET /v1/payments/me`.
The server returns only the authenticated user's recorded transactions, without
private provider data. `usePayments` from `commerce/react` manages loading,
retries and pagination. The Web billing page reads this API through a same-origin
proxy, using the user's bearer token or session cookie, never the server's
ambient token. Historical transactions are shown as recorded, without inventing
missing amounts or statuses.

Architecture tests enforce inward layer dependencies, no reverse registry
imports, and headless entry points. Build and artifact checks also validate
functional exports and the existing facade.

`/web` composes commerce, distribution and package-search views. Astro supplies endpoint URLs; functionality packages never import registry.
