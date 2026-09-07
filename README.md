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

| Paquete              | Dependencias internas @quark                                              |
| -------------------- | ------------------------------------------------------------------------- |
| `@quark/actions`     | tester, use-storage, registry, installer, local-store, permissions, targz |
| `@quark/installer`   | local-store, manifest, permissions, registry, types, targz                |
| `@quark/local-store` | types                                                                     |
| `@quark/manifest`    | —                                                                         |
| `@quark/permissions` | manifest                                                                  |
| `@quark/registry`    | use-storage, types                                                        |
| `@quark/runtime`     | manifest, permissions, types                                              |
| `@quark/targz`       | tester                                                                    |
| `@quark/tester`      | —                                                                         |
| `@quark/types`       | —                                                                         |
| `@quark/use-storage` | —                                                                         |

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
