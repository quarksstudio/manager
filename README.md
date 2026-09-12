# manager

Monorepo Nx que contiene el **cliente** del ecosistema Quark: la CLI, la interfaz web y todas las **librerías NPM** que se publican para ser consumidas externamente (incluido el servidor `quark/server`).

## Estructura

```
apps/
  cli/    @quark/cli             # CLI de Quark
  ui/     @quark/ui              # Interfaz web
packages/                        # librerías publicables a NPM (ver abajo)
tools/
  prepare-npm-packages.mjs       # construye los tarballs de publicación en dist/
  publish-npm-packages.mjs       # publica (o empaqueta en --dry-run) en orden topológico
```

## Publicación a NPM

**Regla de arquitectura: todo lo que vive en `manager` y es una librería se publica a NPM.** No se consume ningún paquete de `manager` apuntando a su source; los consumidores (p. ej. `quark/server`) dependen de la versión publicada instalada desde `node_modules`.

### Paquetes publicables

Todos usan `private: false` y `publishConfig.access: "public"`:

| Paquete              | Dependencias internas @quark                               |
| -------------------- | ---------------------------------------------------------- |
| `@quark/installer`   | local-store, manifest, permissions, registry, types, targz |
| `@quark/local-store` | types                                                      |
| `@quark/manifest`    | —                                                          |
| `@quark/permissions` | manifest                                                   |
| `@quark/registry`    | use-storage, types                                         |
| `@quark/runtime`     | manifest, permissions, types                               |
| `@quark/targz`       | tester                                                     |
| `@quark/tester`      | —                                                          |
| `@quark/types`       | —                                                          |
| `@quark/use-storage` | —                                                          |

### Flujo de publicación

El workflow `.github/workflows/publish-packages.yml` se dispara:

1. **Por tag** `manager-v*` → publica de verdad a `registry.npmjs.org` con `--provenance`.
2. **Manual (`workflow_dispatch`)** → `dry_run` por defecto (empaqueta sin publicar).

El flujo ejecuta `lint`, `test` y `build` de todos los proyectos y luego:

- `node tools/prepare-npm-packages.mjs` — copia cada paquete a `dist/{group}/{dir}`, reescribe el `package.json` de publicación (resuelve `workspace:*` a rangos `^x.y.z`, fija `main`/`types`/`exports`/`files`/`publishConfig`).
- `node tools/publish-npm-packages.mjs [--dry-run]` — publica en orden de dependencias; omite versiones ya existentes.

### Contrato de estructura del build

Cada paquete en `dist/packages/<pkg>/` debe contener su entrada raíz en la **raíz** del dist, coincidiendo con su `main`/`types`:

- `main: ./index.js` y `types: ./index.d.ts` en la raíz.

`prepare-npm-packages.mjs` **valida** que exista `dist/packages/<pkg>/{main}` y aborta si no (línea 28-29). Por tanto:

- El `tsconfig.lib.json` de cada paquete debe emitir achatado (sin prefijo `src/`).
- Un build `@nx/js:tsc` con `rootDir` al `src/` del paquete emite `index.js` en la raíz del `outputPath`.
- **No** se debe dejar un `dist` obsoleto con estructura `src/` (rompe la validación y la resolución por `node_modules`).

> ⚠️ Si `dist/packages/<pkg>/` contiene la entrada en `src/` (p. ej. `dist/packages/tester/src/index.js`) en vez de la raíz, el build quedó obsoleto o mal configurado: reconstruir limpio (`nx reset && nx build <pkg> --skip-nx-cache`).

## Calidad

`ci.yml` garantiza en cada push/PR: `pnpm install --frozen-lockfile`, rechazo de JS generado en `src/`, `format:check`, y `lint`/`test`/`build`.

## CLI presentation

Each owning package exposes commands and screens through `@quark/<package>/CLI`:
`installer`, `registry`, `config`, `local-store`, `publisher`, and `tester`.
`apps/cli` imports these subpaths directly. Shared presentation lives in
`@quark/ui/CLI`. Each React component has its own file under `src/CLI`.
Business entrypoints do not re-export CLI code; lint enforces that boundary.

CLI subpaths are ESM entrypoints because Ink uses top-level await. Business
entrypoints remain CommonJS. `build-lib` emits JavaScript and declarations;
`build` also creates the ESM CLI bundle, sharing the owning business module.
Run `pnpm test:cli-architecture` to validate boundaries and component structure.
After building the CLI and its dependencies, run `pnpm test:cli-artifacts` to
check compiled exports and command help in an isolated temporary fixture.

## Web presentation

`packages/ui` also ships `@quark/ui/web` and `@quark/ui/web/styles.css` (ESM,
Ink-free) with the package-detail page components. `apps/ui` renders them at
`/packages/:packageName` and talks to the registry through `@quark/registry`
(`configureRegistry(import.meta.env.VITE_REGISTRY_API_URL ?? '/v1')`).

The web surface may depend on `@quark/registry` but never on `@quark/*` others
or the Ink `./CLI` tree; CLI files are blocked from `./web` in turn
(`no-restricted-imports` in `eslint.config.mjs`). The Nx build cycle between
`cli-ui` and `registry` is avoided with explicit `dependsOn` and a
`src/CLI/**` exclusion in the `registry` library tsconfig; `build-web` runs
after `build-lib` because the TSC clean step would wipe the bundled web entry.
Run `pnpm test:web-architecture` and `pnpm test:cli-artifacts` (which asserts
the web bundle exposes `PackageDetails` and never loads Ink).
