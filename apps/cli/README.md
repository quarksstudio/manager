# @quarks.studio/cli

Command-line interface for installing, publishing, searching, and managing Quark skills.

## Responsibilities

- Authenticate users and maintain local CLI configuration.
- Install skills for one or more model targets, reusing the local archive cache.
- Run local verification and publish immutable skill archives to the server.
- Search, remove, and inspect cached skills.

`publish` only reports local verification. It never creates an official certificate: after upload, the server performs Tier 1 synchronously and owns every official Tier 2–4 certification.

## Commands

```bash
quark auth login github
quark search jira
quark install jira-ticket-manager --models openai,claude --where ./workspace
quark publish ./jira-ticket-manager --tier TIER_1
quark cache list
quark cache verify
quark cache clean
```

Use `quark publish <folder> --dry-run` to build and verify an archive without uploading it. Authentication tokens are stored by the actions and local-store packages; do not pass credentials as command arguments.

## Registry search

`search` (alias `find`) displays one page from the registry, its total match count,
and the next cursor when more results exist. Cached local results are not mixed
into this page.

```bash
quark search e2e
quark search --query e2e
quark find --search e2e
quark search --tags e2e,testing --match-mode any
quark search --author USER_UID --limit 10
quark search --name demo --exact
quark search --query e2e --exact false --limit 10 --cursor CURSOR
```

The text priority is `--query`, then `--search`, then the optional positional
argument. You can also use `--name`, `--summary`, `--author` (UID), and `--tags`
(comma-separated). `--match-mode` accepts `any` (default) or `all`; the server
currently supports `all` with only one tag. Tags cannot be combined with author
or authenticated private-access searches.

`--exact` means true; `--exact true` and `--exact false` are also supported. Partial
text search ignores case and finds text anywhere in the name or description.
`--limit` must be a positive integer; the server defaults to 20 and caps it at 100.
To follow a cursor, repeat the same filters and limit and pass `--cursor` with the
printed value. Pages are not loaded automatically. `quark search` without filters
requests the first page. `--models` remains accepted for compatibility and does
not affect registry searches. Invalid options and API failures exit with a nonzero
status.

## Development

```bash
pnpm nx build cli
pnpm nx serve cli
```

The executable is emitted to `dist/apps/cli`. Commands are imported directly from the owning packages through their `/CLI` exports. Shared presentation is provided by `@quarks.studio/terminal-ui`.

`pnpm nx build cli` bundles all `@quarks.studio/*` code into `main.js`.
The output package includes its manifest, lockfile and README; it has no workspace
dependencies and does not require `dist/packages` or workspace links at runtime.
Third-party packages such as React and Ink remain external dependencies.

For local development, the build links installed third-party dependencies under
`dist`, including when Nx reuses the bundle from cache. Run it directly with:

```bash
node ./dist/apps/cli/main.js auth login google -s manual-code
```

To distribute the CLI, copy `dist/apps/cli` and install the dependencies from its
`package.json` and `pnpm-lock.yaml`. The build does not copy workspace modules.
