# manager

Nx monorepo containing the **client** of the Quark ecosystem: the CLI, the web
interface and all the **NPM libraries** that are published for external
consumers (including the `quark/server` server).

## Structure

```
apps/
  cli/    @quarks.studio/cli             # Quark CLI
  ui/     @quarks.studio/ui              # Web interface
packages/                        # libraries publishable to NPM (see below)
tools/
  prepare-npm-packages.mjs       # builds the publish tarballs into dist/
  publish-npm-packages.mjs       # publishes (or packages with --dry-run) in topological order
```

## Logging

The CLI writes logs to `stderr` and defaults to `silent` (nothing is printed).
The verbosity is chosen from, in order of precedence:

1. `--loglevel <level>` (sets the level directly),
2. `--verbose` (equivalent to `--loglevel verbose`),
3. the `QUARK_LOG_LEVEL` environment variable,
4. the `log` key in `~/.config/quark/config.ini`,
5. `silent`.

Levels are npm-style: `silent`, `error`, `warn`, `notice`, `http`, `info`,
`verbose`, `silly`. A level emits messages of that level or more severe. For
example `quark --loglevel http publish .` shows API traffic and uploads, while
`quark --verbose install cloud-skill` traces archive downloads and extraction.

The `log` config value can be persisted with
`quark config set log verbose`; invalid levels are rejected.

## Publishing to NPM

**Architecture rule: everything that lives in `manager` and is a library gets published to NPM.** No consumer points at a `manager` package's source; consumers (e.g. `quark/server`) depend on the published version installed from `node_modules`.

### Publishable packages

All use `private: false` and `publishConfig.access: "public"`:

| Package                      | Internal @quarks.studio dependencies                                |
| ---------------------------- | ------------------------------------------------------------------- |
| `@quarks.studio/config`      | logger, ui, use-storage                                             |
| `@quarks.studio/installer`   | local-store, logger, manifest, permissions, registry, types, targz  |
| `@quarks.studio/local-store` | types                                                               |
| `@quarks.studio/logger`      | —                                                                   |
| `@quarks.studio/manifest`    | —                                                                   |
| `@quarks.studio/permissions` | manifest                                                            |
| `@quarks.studio/publisher`   | logger, registry, targz, tester, ui                                 |
| `@quarks.studio/registry`    | logger, use-storage, types                                          |
| `@quarks.studio/runtime`     | manifest, permissions, types                                        |
| `@quarks.studio/targz`       | tester                                                              |
| `@quarks.studio/tester`      | —                                                                   |
| `@quarks.studio/types`       | —                                                                   |
| `@quarks.studio/ui`          | registry, use-storage                                               |
| `@quarks.studio/use-storage` | —                                                                   |
| `@quarks.studio/cli`         | config, installer, local-store, logger, publisher, registry, tester |
| `@quarks.studio/ui-app`      | —                                                                   |

### Versioning

The release version is set with `tools/set-release-version.mjs <version>`
(rewrites the `version` field of every publishable package). Tags and branches
follow the semver convention:

- `main` is the **stable** branch. When cutting a release, a concrete version
  (e.g. `0.1.0`) is published and tagged `manager-v0.1.0` (CI publishing
  derives the version from the tag).
- `develop` is the **development** branch with prereleases (`0.2.0-beta`...).
  By semver precedence a prerelease (`0.2.0-beta`) always sorts ahead of the
  next stable release (`0.2.0`), so `develop` can never publish the stable
  version.

### Publishing flow

The `.github/workflows/publish-packages.yml` workflow is triggered:

1. **By tag** `manager-v*` → actually publishes to `registry.npmjs.org` with
   `--provenance`. The tag must be `manager-v<version>` (e.g. `manager-v0.1.0`).
2. **Manual (`workflow_dispatch`)** → `dry_run` by default (packages without
   publishing); requires the `version` input.

The workflow runs `lint`, `test` and `build` for all projects and then:

- `node tools/set-release-version.mjs <version>` — sets the release version on
  all publishable packages (derived from the tag on CI publications).
- `node tools/prepare-npm-packages.mjs` — copies each package to
  `dist/{group}/{dir}`, rewrites the publish `package.json` (resolves
  `workspace:*` to `^x.y.z` ranges, sets `main`/`types`/`exports`/`files`/
  `publishConfig`).
- `node tools/publish-npm-packages.mjs [--dry-run]` — publishes in dependency
  order; skips versions that already exist.

### Build structure contract

Each package under `dist/packages/<pkg>/` must contain its root entrypoint at
the **root** of the dist, matching its `main`/`types`; for **subpath-only**
packages without a root `main` (e.g. `@quarks.studio/ui`, which exposes
`./CLI`, `./hooks` and `./web`), `prepare-npm-packages.mjs` validates each
`exports` target instead of the root:

- `main: ./index.js` and `types: ./index.d.ts` at the root; or `exports`
  pointing at files emitted by the build.

`prepare-npm-packages.mjs` **validates** that every expected output exists and
aborts otherwise. Therefore:

- Each package's `tsconfig.lib.json` must emit flattened (without the `src/`
  prefix).
- An `@nx/js:tsc` build with `rootDir` at the package's `src/` emits
  `index.js` at the root of the `outputPath`.
- **Do not** leave a stale `dist` with a `src/` structure (it breaks the
  validation and `node_modules` resolution).

> ⚠️ If `dist/packages/<pkg>/` contains the entrypoint under `src/` (e.g.
> `dist/packages/tester/src/index.js`) instead of the root, the build is stale
> or misconfigured: rebuild clean (`nx reset && nx build <pkg> --skip-nx-cache`).

## Quality

`ci.yml` guarantees on every push/PR: `pnpm install --frozen-lockfile`, rejection
of generated JS in `src/`, `format:check`, and `lint`/`test`/`build`.

## CLI presentation

Each owning package exposes commands and screens through `@quarks.studio/<package>/CLI`:
`installer`, `registry`, `config`, `local-store`, `publisher`, and `tester`.
`apps/cli` imports these subpaths directly. Shared presentation lives in
`@quarks.studio/ui/CLI`. Each React component has its own file under `src/CLI`.
Business entrypoints do not re-export CLI code; lint enforces that boundary.

CLI subpaths are ESM entrypoints because Ink uses top-level await. Business
entrypoints remain CommonJS. `build-lib` emits JavaScript and declarations;
`build` also creates the ESM CLI bundle, sharing the owning business module.
Run `pnpm test:cli-architecture` to validate boundaries and component structure.
After building the CLI and its dependencies, run `pnpm test:cli-artifacts` to
check compiled exports and command help in an isolated temporary fixture.

## Web presentation

`@quarks.studio/ui/web` exports reusable React presentation and `@quarks.studio/ui/web/styles.css` exports compiled CSS. Components receive data and action URLs; data hooks remain in the separate `@quarks.studio/ui/hooks` entry. The web entry has no session or transport access and does not load Ink.

`apps/ui` is an independent Vite demo using fixtures at the same package URLs as Server. Server owns the Astro routes, request-scoped `@quarks.studio/registry/client`, session cookies, mutations and downloads. Server installs versioned npm artifacts and never reads this checkout.

All libraries use `packages/<name>/src` and `packages/<name>/test`; apps retain their own `src` and `test`. Run `pnpm test:package-architecture`, `pnpm test:web-architecture`, and, after building, `pnpm test:web-artifacts` and `pnpm test:cli-artifacts`.

Release 0.2.0 changes the `PackageDetails` props contract. Publish it before updating Server's lockfile.
