# @quark/registry

React hooks for authenticated registry access:

- `useSearchPackages(query)`
- `useFetchPackage(name)`
- `usePackageReadme(name, version)`
- `usePackageCertifications(name, version?)`
- `useUpdatePackageMetadata()` for the description/tags/authors editor
- `useCurrentUser()`
- `useRegistryClient()` for event handlers and mutations

The readme and certification hooks power the web package-detail page
(`@quark/ui/web`) and are exercised by `tools/check-cli-artifacts.mjs` through
the built bundle.

Node workflows can use the lower-level `apiFetch` and `apiRequest` exports.

Archive publication without React or Ink uses `configureRegistry(api)` and
`uploadPackageArchive(input)` from `@quark/registry/upload`. The endpoint is
shared with `Client.API`. Upload accepts archive bytes, filename, package name,
version, description and an optional token (otherwise `MANAGER_SERVER_TOKEN`).

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

# @quark/registry

Cliente del registry, autenticación y hooks React. También expone `registerAuditorPasskey` y `signAuditDecision`, que ejecutan las ceremonias WebAuthn S4 contra los endpoints del servidor sin manejar claves privadas en JavaScript.

## CLI

Screens and command adapters live in `src/CLI`, one React component per file.
Import them through `@quark/registry/CLI`; the main entrypoint keeps its
business API and does not load CLI presentation. Shared Ink components and
terminal helpers come from `@quark/ui/CLI`.
