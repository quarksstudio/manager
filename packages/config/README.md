# @quark/config

Gestión de configuración del CLI de Quark. El dominio modela los valores de configuración (`AppConfig`), el repositorio persiste en `~/.config/quark/config.ini` (INI) y migra tokens legacy al storage de sesión.

El hook `useConfig` expone el estado de configuración a componentes React.

```bash
pnpm nx build config
pnpm nx test config
```

## CLI

Screens and command adapters live in `src/CLI`, one React component per file.
Import them through `@quark/config/CLI`; the main entrypoint keeps its
business API and does not load CLI presentation. Shared Ink components and
terminal helpers come from `@quark/ui/CLI`.
