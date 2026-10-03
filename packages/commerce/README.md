# @quarks.studio/commerce

DDD functionality with domain rules, application ports and injected adapters.

- Root: models, ports and use cases, without React or Ink.
- `/http`: infrastructure factories accepting dependencies.
- `/react`: shared React hooks and provider.

Run `pnpm nx test commerce` and `pnpm nx build commerce`.

Commerce owns both commercial catalog and payments/subscriptions.

Use `createHttpCatalog(context)` and `createHttpBillingGateway(context)` from
`/http`. `BillingGateway.listPayments({ limit?, cursor? })` reads the current
user's recorded transactions through `GET /v1/payments/me`.

Wrap components in `CommerceProvider` with injected services and call
`usePaymentLink` or `usePayments` from `/react`. For configured manager services,
use `RegistryProvider` from `@quarks.studio/registry/react`.

`/web` owns this functionality's Web views and injected service providers.
Run `pnpm nx test-web commerce` for its presentation tests.
