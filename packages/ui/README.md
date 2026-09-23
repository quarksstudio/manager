# @quarks.studio/ui

Shared presentation layer for Quark. It ships three entry points, all built
with one React component per file:

- `@quarks.studio/ui/CLI` — Ink terminal components for Quark commands. There is no
  root entry (`@quarks.studio/ui`); the package exposes only subpaths.
- `@quarks.studio/ui/hooks` — the shared hooks (`src/hooks`).
- `@quarks.studio/ui/web` — browser components for the manager application, including
  `PackageDetails` and `@quarks.studio/ui/web/styles.css` (Tailwind 4 + shadcn tokens).

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
`src/lib/storage.ts`) and are re-exported by `@quarks.studio/ui/hooks` and
`@quarks.studio/ui/web`:

- `usePackageDetailsView`, `usePackageDownload`,
  `usePackageMetadataEditor`: the package detail page state.
- `useCachedQuery`, `useReadmeCached`: cache-first queries on
  `@quarks.studio/use-storage` for the web surface.

The web surface may depend on `@quarks.studio/registry` but must never reach
`@quarks.studio/registry/CLI`, other `@quarks.studio/*` packages, or the Ink `./CLI` tree;
the reverse boundary is enforced for CLI files too (see `eslint.config.mjs`
and `tools/web-architecture.spec.mjs`).

## Build and validate

```bash
pnpm nx build cli-ui
pnpm nx test cli-ui
pnpm node tools/web-architecture.spec.mjs
```

The directory is `packages/ui` and the package is `@quarks.studio/ui`. Its Nx project
name remains `cli-ui` because `ui` identifies the application in `apps/ui`
(package `@quarks.studio/ui-app`).

## Structure

```text
src/CLI/
├── components/       # layout, data, feedback, input
├── terminal/         # render-action, exit-codes, tty
├── theme.ts
├── types.ts
└── index.ts          # Explicit public exports (Ink only)
src/hooks/            # Shared hooks (entry for @quarks.studio/ui/hooks)
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
of `@quarks.studio/ui/CLI`, `@quarks.studio/ui/hooks` and `@quarks.studio/ui/web` remain explicit.

## Server-rendered web presentation (0.2)

Import `PackageDetails`, `Home`, and presentation primitives from `@quarks.studio/ui/web`, and import the compiled stylesheet from `@quarks.studio/ui/web/styles.css`. `PackageDetails` now receives `detail`, `selectedVersion`, README state, and `urls` (retry, versions, downloads, metadata); it does not fetch data or read a session. This replaces the previous fetching component contract. The optional draft/error props preserve unsuccessful form submissions. Native links and forms remain usable without hydration; React adds visual tabs.

Existing data hooks remain in `@quarks.studio/ui/hooks`, separate from presentation. React and React DOM are peer dependencies. Package source lives in `src`; tests live in `test` and are excluded from npm artifacts.
