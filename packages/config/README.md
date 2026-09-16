# @quarks.studio/config

Configuration management for the Quark CLI. The domain models the configuration
values (`AppConfig`), the repository persists them in
`~/.config/quark/config.ini` (INI) and migrates legacy tokens to the session
storage.

The `useConfig` hook exposes the configuration state to React components.

```bash
pnpm nx build config
pnpm nx test config
```

## CLI

Screens and command adapters live in `src/CLI`, one React component per file.
Import them through `@quarks.studio/config/CLI`; the main entrypoint keeps its
business API and does not load CLI presentation. Shared Ink components and
terminal helpers come from `@quarks.studio/ui/CLI`.