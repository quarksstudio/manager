# @quarks.studio/package-search

DDD functionality with domain rules, application ports and injected adapters.

- Root: models, ports and use cases, without React or Ink.
- `/http`: infrastructure factories accepting dependencies.
- `/hooks`: shared React hooks.
- `/presentation`: providers and presentation contracts.

Run `pnpm nx test package-search` and `pnpm nx build package-search`.

`/web` owns this functionality's Web views and injected service providers.
Run `pnpm nx test-web package-search` for its presentation tests.

## Remote Firestore search

The registry uses Firestore Standard queries. `query` searches a package **name prefix**, rather than a substring across name, description and tags. `name` and `description` accept prefixes, or equality with `exact: true`. Comparisons are case-sensitive. Tags match complete values; `matchMode: all` supports one tag only.

The registry includes public packages and private packages the signed-in user may access. Firestore cannot combine tag membership with author/private-access membership, or a different author with private-access membership. Those requests return HTTP 400; the client exposes this as `useSearchPackages().searchError` while preserving available results. The CLI displays the error instead of reporting an empty successful search.

Pagination cursors are opaque and tied to the filters, authenticated user and page size. Start a new search without a cursor after changing any of them. Local catalog search retains its existing substring behavior.

## Homepage search

The UI homepage keeps its landing content without search parameters. A URL such as `/?query=demo`, `/?tags=AI&tags=chat` or `/?author=uid` renders a browser-only search component instead. `/?query=` opens the complete visible catalog. Tracking parameters alone do not activate search. Legacy `q` becomes `query` only when neither `query` nor `search` is present.

`ConfiguredPackageSearchResults` forwards recognized URL parameters to the backend through `createHttpPackageSearch().searchParams()`, preserving repeated values and without adding filters. It renders backend totals and package cards, and follows opaque cursors with **Load more**. New searches reset pagination; later pages keep the same filters. Unsupported queries show an explanation, other failures offer retry, and existing cards remain visible when pagination fails.
