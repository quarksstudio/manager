# @quark/ui

Compiled static web application for the Quark manager interface.

The application provides the browser-facing skill catalogue and management experience. It consumes the manager registry APIs through the shared client packages and uses `@quark/use-storage` for browser-safe persisted state.

The registry endpoint is configured at runtime via `configureRegistry(...)`
using `VITE_REGISTRY_API_URL` (default `/v1`). The library styles come from
`@quark/ui/web/styles.css`; the app scans `packages/ui/src/web` with Tailwind
4 (`@source`) so shared components produce their utility classes.

## Routes

- `/` — home placeholder.
- `/packages/:packageName` — package details (versioned README, certifications,
  downloads, editable metadata when permitted). Scoped names are decoded from
  the URL-encoded path segment (e.g. `%40scope%2Ftool` → `@scope/tool`).

## Development

```bash
pnpm nx build ui
pnpm nx test ui
```

The production build is written to `dist/apps/ui`. Runtime API URLs and deployment hosting are supplied by the environment that serves the static bundle; this project does not run the certification containers.
