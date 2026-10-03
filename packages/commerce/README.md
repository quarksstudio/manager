# @quarks.studio/commerce

DDD functionality with domain rules, application ports and injected adapters.

- Root: models, ports and use cases, without React or Ink.
- `/http`: infrastructure factories accepting dependencies.
- `/hooks`: shared React hooks.
- `/presentation`: providers and presentation contracts.

Run `pnpm nx test commerce` and `pnpm nx build commerce`.

Commerce owns both commercial catalog and payments/subscriptions.

Use `createHttpCatalog(context)` and `createHttpBillingGateway(context)` from
`/http`. `BillingGateway.listPayments({ limit?, cursor? })` reads the current
user's recorded transactions through `GET /v1/payments/me`.

Wrap components in `CommerceProvider` with injected services and call
`usePaymentLink` or `usePayments` from `/hooks`. For configured manager services,
use `CommerceProvider` from `@quarks.studio/commerce/presentation`.

`/web` owns this functionality's Web views and injected service providers.
Run `pnpm nx test-web commerce` for its presentation tests.

Domain contracts are exported by this package; there is no shared types facade.
