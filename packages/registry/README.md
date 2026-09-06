# @quark/registry

React hooks for authenticated registry access:

- `useSearchPackages(query)`
- `useFetchPackage(name)`
- `useCurrentUser()`
- `useRegistryClient()` for event handlers and mutations

Node workflows can use the lower-level `apiFetch` and `apiRequest` exports.

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
