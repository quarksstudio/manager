# @quarks.studio/package-search

DDD functionality with domain rules, application ports and injected adapters.

- Root: models, ports and use cases, without React or Ink.
- `/http`: infrastructure factories accepting dependencies.
- `/hooks`: shared React hooks.
- `/presentation`: providers and presentation contracts.

Run `pnpm nx test package-search` and `pnpm nx build package-search`.

`/web` owns this functionality's Web views and injected service providers.
Run `pnpm nx test-web package-search` for its presentation tests.
