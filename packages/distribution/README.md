# @quarks.studio/distribution

DDD functionality with domain rules, application ports and injected adapters.

- Root: models, ports and use cases, without React or Ink.
- `/http`: infrastructure factories accepting dependencies.
- `/react`: shared React hooks and provider.

Run `pnpm nx test distribution` and `pnpm nx build distribution`.

`/web` owns this functionality's Web views and injected service providers.
Run `pnpm nx test-web distribution` for its presentation tests.
