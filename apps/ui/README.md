# @quark/ui

Compiled static web application for the Quark manager interface.

The application provides the browser-facing skill catalogue and management experience. It consumes the manager registry APIs through the shared client packages and uses `@quark/use-storage` for browser-safe persisted state.

## Development

```bash
pnpm nx build ui
pnpm nx test ui
```

The production build is written to `dist/apps/ui`. Runtime API URLs and deployment hosting are supplied by the environment that serves the static bundle; this project does not run the certification containers.
