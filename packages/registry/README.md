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

## Internal structure

The code is organised as bounded contexts, one directory per business area. The
public entry points above are the contract; the layout below is an
implementation detail and may change without a major version bump.

```
src/
  identity/        who is asking        (auth, sessions, passkeys)
  catalog/         what exists           (package search, local cache)
  distribution/    how it is published    (versions, readme, metadata)
  billing/         what it costs          (payment gateway)
  certification/   whether it is trusted  (audit decisions, WebAuthn)
  publication/     how an archive ships   (upload, tarball)
  transport/       shared HTTP kernel     (no business rules)
  composition/     wiring                 (the ambient roots)
  CLI/             Ink presentation
```

Each context is layered inward, and a layer only knows the ones above it:

- `domain/` — the model and the rules, with no I/O. It is the one layer worth
  reading first: everything else serves it.
- `application/` — a use case. It depends on ports (`identity.port.ts`,
  `package-registry.port.ts`, …) that it never implements.
- `infrastructure/` — the adapters that satisfy those ports over HTTP, storage,
  the filesystem or a browser API.
- `composition/` — the only place that chooses an implementation. `ambient-*.ts`
  wires the adapters to the real transport, storage and configuration for
  callers that have no injection point of their own, which is why the public
  functions are so short. `ambient-client.ts` and `ambient-context.ts` hold the
  process-wide singletons, so a package is not fetched twice per process.

Two rules keep the contexts from quietly merging, and both are enforced by
`test/architecture.spec.ts` rather than by convention:

- A `domain` imports no adapter, and an `application` imports no adapter. If a
  use case needs a new capability, add it to its port.
- `domain` and `application` never reach the transport, the composition root or
  the entry points, and never import React, Ink, the configuration singleton or
  `use-storage`. That is what lets a CLI, a server renderer and a browser share
  the same use cases.

`src/CLI/` is deliberately the exception: it reaches into `../index` for its
business API, and `tools/build-cli.mjs` externalises exactly that specifier. Any
other import from `src/CLI/` would be inlined into the CLI bundle, so it stays
import-style minimal.
