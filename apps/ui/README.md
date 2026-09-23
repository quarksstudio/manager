# @quarks.studio/ui

React application embedded in the Astro site at `server/apps/web`.

The application provides the browser-facing skill catalogue and management experience. It consumes the manager registry APIs through the shared client packages and uses `@quarks.studio/use-storage` for browser-safe persisted state.

The registry endpoint is configured at runtime via `configureRegistry(...)`
using the `apiUrl` prop supplied by Astro (`PUBLIC_REGISTRY_API_URL`, default `/v1`). The library styles come from
`@quarks.studio/ui/web/styles.css`; the app scans `packages/ui/src/web` with Tailwind
4 (`@source`) so shared components produce their utility classes.

## Routes

- `/` — home placeholder.
- `/packages/:packageName` — package details (versioned README, certifications,
  downloads, editable metadata when permitted). Scoped names are decoded from
  the URL-encoded path segment (e.g. `%40scope%2Ftool` → `@scope/tool`).

## Development

```bash
pnpm nx dev ui
pnpm nx build ui
pnpm nx test ui
```

Development and build commands delegate to the sibling `server` repository.
Install its dependencies too. The Astro build is written to `server/dist/apps/web`
and served at `http://localhost:4200`. There is no separate Vite HTML application.
