# @quark/ui

Shared presentation layer for Quark. It ships three entry points, all built
with one React component per file:

- `@quark/ui/CLI` — Ink terminal components for Quark commands. There is no
  root entry (`@quark/ui`); the package exposes only subpaths.
- `@quark/ui/hooks` — the shared hooks (`src/hooks`).
- `@quark/ui/web` — browser components for the manager application, including
  `PackageDetails` and `@quark/ui/web/styles.css` (Tailwind 4 + shadcn tokens).

## CLI

All implementations live in `src/CLI`.

- `Screen`, `Panel`, `Table`, `KeyValue`, `StepList`: layout and data.
- `Result`, `StatusLine`, `EmptyState`, `Select`: feedback and input.
- `theme`, presentation types: shared UI state.
- `renderAction`, `isInteractive`, `EXIT_CODES`: terminal adapters.

Business modules must not import it; only their CLI presentation may consume it.

## Web

All implementations live in `src/web`. The bundle is produced by
`tools/build-web.mjs` as an Ink-free ESM entry (`dist/packages/ui/src/web`).

- `PackageDetails`, `PackageTabs`, `PackageSidebar`, `ReadmeTab`,
  `VersionsTab`, `CertsTab`, `ConfigTab`: the package detail page.
- `lib/markdown` (marked + DOMPurify), `lib/versions`, `lib/format`.

## Shared hooks

All in-use hooks live in `src/hooks` (plus the cache infrastructure in
`src/lib/storage.ts`) and are re-exported by `@quark/ui/hooks` and
`@quark/ui/web`:

- `usePackageDetailsView`, `usePackageDownload`,
  `usePackageMetadataEditor`: the package detail page state.
- `useCachedQuery`, `useReadmeCached`: cache-first queries on
  `@quark/use-storage` for the web surface.

The web surface may depend on `@quark/registry` but must never reach
`@quark/registry/CLI`, other `@quark/*` packages, or the Ink `./CLI` tree;
the reverse boundary is enforced for CLI files too (see `eslint.config.mjs`
and `tools/web-architecture.spec.mjs`).

## Build and validate

```bash
pnpm nx build cli-ui
pnpm nx test cli-ui
pnpm node tools/web-architecture.spec.mjs
```

The directory is `packages/ui` and the package is `@quark/ui`. Its Nx project
name remains `cli-ui` because `ui` identifies the application in `apps/ui`
(package `@quark/ui-app`).

## Structure

```text
src/CLI/
├── components/       # layout, data, feedback, input
├── terminal/         # render-action, exit-codes, tty
├── theme.ts
├── types.ts
└── index.ts          # Explicit public exports (Ink only)
src/hooks/            # Shared hooks (entry for @quark/ui/hooks)
src/lib/
└── storage.ts        # apiCache, packageCacheKey, readmeCacheKey
src/web/
├── components/
│   ├── package-details/   # Page composition
│   └── ui/                # Tabs, Button, Card, Input, …
├── lib/              # markdown, versions, format, cn
├── index.ts          # Explicit public exports
└── styles.css
```

Internal imports reference their defining files directly. The public exports
of `@quark/ui/CLI`, `@quark/ui/hooks` and `@quark/ui/web` remain explicit.
