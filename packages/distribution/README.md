# @quarks.studio/distribution

DDD functionality with domain rules, application ports and injected adapters.

- Root: models, ports and use cases, without React or Ink.
- `/http`: infrastructure factories accepting dependencies.
- `/hooks`: shared React hooks.
- `/presentation`: providers and presentation contracts.

Run `pnpm nx test distribution` and `pnpm nx build distribution`.

`/web` owns this functionality's Web views and injected service providers.
Run `pnpm nx test-web distribution` for its presentation tests.

`/hooks` also exports the detail view, cached README, download and metadata editor hooks.
`DistributionProvider` receives package methods, `downloadBundle` and `getCurrentUser` from the host.

Domain contracts are exported by this package; there is no shared types facade.
