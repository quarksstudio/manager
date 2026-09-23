# Public component demo

This application runs independently of Server. It renders the public React components using fixtures, at `/`, `/packages/:packageName` and `/packages/:packageName/:versionPackage`.

Run `pnpm exec nx dev ui` or `pnpm exec nx build ui`. Query parameter `state` selects `ready`, `loading`, `error`, `empty`, `readonly`, or `readme-error`.

Production routing, sessions and data operations belong to Server's Astro application. Reusable presentation is exported by `@quarks.studio/ui/web`; browser hooks remain separately available at `@quarks.studio/ui/hooks`.
