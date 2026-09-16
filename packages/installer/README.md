# @quarks.studio/installer

Safe, recursive skill installer. It resolves versions/dependencies, validates
permissions, verifies SHA-256, audits and extracts TAR, applies mappings
transactionally and writes `skill.lock.yml`.

It automatically reuses verified bundles from `~/.quark/cache/skills`; `force`
forces a download. It supports Node/Python skills because it installs artifacts
without reinterpreting their runtime.

API: `install`, `installSkill`, `uninstall`, `InstallOptions` and
`InstallResult`.

```bash
pnpm nx build installer
pnpm nx test installer
```

## CLI

Screens and command adapters live in `src/CLI`, one React component per file.
Import them through `@quarks.studio/installer/CLI`; the main entrypoint keeps
its business API and does not load CLI presentation. Shared Ink components and
terminal helpers come from `@quarks.studio/ui/CLI`.